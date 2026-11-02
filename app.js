// Static-preview behaviour for the cloned pages (no backend).
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---------- Login: only one account is accepted (credentials stored as a salted PBKDF2 hash, never in plain text)
  var CRED = { salt: '0b1cbe66393a7220a6bcade1bed59c26', hash: '111d561f589c5470608f8f252c5cff1ef39146da2a768146b9a458f9f21b34de', iter: 200000 };
  function hexToBytes(h) { var b = new Uint8Array(h.length / 2); for (var i = 0; i < b.length; i++) b[i] = parseInt(h.substr(i * 2, 2), 16); return b; }
  function checkCred(id, pass) {
    if (!(window.crypto && crypto.subtle)) return Promise.resolve(false);
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(id.trim().toLowerCase() + '\n' + pass), 'PBKDF2', false, ['deriveBits'])
      .then(function (key) { return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(CRED.salt), iterations: CRED.iter }, key, 256); })
      .then(function (bits) { return Array.prototype.map.call(new Uint8Array(bits), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('') === CRED.hash; })
      .catch(function () { return false; });
  }
  function loginError(form, show) {
    var msg = form.querySelector('.ab-login-error');
    if (!msg) {
      msg = document.createElement('p');
      msg.className = 'ab-login-error';
      msg.setAttribute('role', 'alert');
      msg.textContent = 'Wrong email or password';
      var pwBlock = form.querySelector('#password').closest('div');
      pwBlock.appendChild(msg);
    }
    msg.style.display = show ? 'block' : 'none';
    form.querySelectorAll('#user-phone, #password').forEach(function (i) { i.classList.toggle('ab-input-error', !!show); });
  }
  document.addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target, id = form.querySelector('#user-phone'), pass = form.querySelector('#password');
    if (!id || !pass) return;
    var btn = form.querySelector('button:not([type=button])');
    if (btn) btn.disabled = true;
    checkCred(id.value, pass.value).then(function (ok) {
      if (btn) btn.disabled = false;
      if (!ok) { loginError(form, true); return; }
      loginError(form, false);
      try { sessionStorage.removeItem('ab-notes-read'); } catch (err) {}
      location.href = 'panel.html#login';
    });
  });

  var pw = $('#password');
  var showBtn = $('.show-password');
  if (pw && showBtn) {
    showBtn.addEventListener('click', function () {
      var hidden = pw.type === 'password';
      pw.type = hidden ? 'text' : 'password';
      showBtn.textContent = hidden ? 'hide' : 'show';
    });
  }

  var phoneInput = $('#user-phone');
  if (phoneInput) {
    var label = $('label[for=user-phone]');
    var btns = $$('.flex.gap-2 > button', phoneInput.closest('form'));
    var ON = ['border-primary', 'bg-primary', 'text-white'];
    var OFF = ['border-bgTertiary', 'bg-bgPrimary', 'text-textPrimary', 'hover:border-primary'];
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () {
        btns.forEach(function (o) {
          ON.forEach(function (c) { o.classList.toggle(c, o === b); });
          OFF.forEach(function (c) { o.classList.toggle(c, o !== b); });
        });
        var phone = i === 0;
        phoneInput.type = phone ? 'tel' : 'email';
        phoneInput.placeholder = phone ? 'phone' : 'email';
        phoneInput.value = '';
        if (label) label.textContent = phone ? 'Phone Number (With country code)' : 'Email';
      });
    });
  }

  // ---------- Panel: logout icon -> home
  $$('button svg path').forEach(function (p) {
    if ((p.getAttribute('d') || '').indexOf('M14 8v-2') === 0) {
      p.closest('button').addEventListener('click', function () { location.href = 'index.html'; });
    }
  });

  // ---------- Owned course: "فتح الكورس" -> course content page
  $$('[data-open-course]').forEach(function (b) {
    b.addEventListener('click', function (e) { e.stopPropagation(); location.href = 'course.html'; });
  });

  // ---------- Chakra tabs
  $$('[role=tablist]').forEach(function (list) {
    var tabs = $$('[role=tab]', list);
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          t.setAttribute('tabindex', on ? '0' : '-1');
          var panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) { if (on) panel.removeAttribute('hidden'); else panel.setAttribute('hidden', ''); }
        });
      });
    });
  });

  // ---------- Chakra accordion (open / close an item)
  $$('.chakra-accordion__button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.chakra-accordion__item');
      if (!item) return;
      var cols = $$('.chakra-collapse', item).filter(function (c) { return c.closest('.chakra-accordion__item') === item; });
      if (!cols.length) return;
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      cols.forEach(function (c) {
        if (!c.children.length) return;
        c.style.display = open ? 'none' : 'block';
        c.style.opacity = open ? '0' : '1';
        c.style.height = open ? '0px' : 'auto';
      });
      var icon = $('.chakra-accordion__icon', btn);
      if (icon) icon.style.transform = open ? '' : 'rotate(-180deg)';
    });
  });

  // ---------- Course description: "رؤية المزيد.." / "رؤية اقل"
  $$('.chakra-accordion__item').forEach(function (item) {
    var full = $('template[data-full]', item);
    var lessT = $('template[data-less-btn]', item);
    if (!full) return;
    var c1 = $('.chakra-collapse', item);
    var shortHTML = c1.innerHTML;
    var moreBtn = $('[data-more-btn]', item);
    if (!moreBtn) return;
    var moreHTML = moreBtn.outerHTML;
    var expanded = false;
    function bind(btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        expanded = !expanded;
        c1.innerHTML = expanded ? full.innerHTML : shortHTML;
        var tmp = document.createElement('div');
        tmp.innerHTML = expanded && lessT ? lessT.innerHTML : moreHTML;
        var nb = tmp.firstElementChild;
        btn.replaceWith(nb);
        bind(nb);
      });
    }
    bind(moreBtn);
  });

  // ---------- "عرض المزيد" lists (10 more per click)
  $$('[data-more-grid]').forEach(function (grid) {
    var wrap = grid.parentElement.querySelector('[data-more-wrap]') || (grid.nextElementSibling && grid.nextElementSibling.matches('[data-more-wrap]') ? grid.nextElementSibling : null);
    var btn = wrap ? $('button', wrap) : null;
    if (!btn) return;
    btn.addEventListener('click', function () {
      var hidden = $$('[data-more]:not(.is-shown)', grid).slice(0, 10);
      hidden.forEach(function (c) { c.classList.add('is-shown'); });
      if (!$$('[data-more]:not(.is-shown)', grid).length) wrap.style.display = 'none';
    });
  });
  // my-courses: extra cards live in the same grid as the visible ones
  $$('button').forEach(function (b) {
    if (b.textContent.trim() !== 'عرض المزيد' || b.closest('[data-more-wrap]')) return;
    var cards = $$('[data-more]');
    if (!cards.length) { return; }
    b.addEventListener('click', function () {
      cards.forEach(function (c) { c.classList.add('is-shown'); });
      (b.parentElement || b).style.display = 'none';
    });
  });

  // ---------- Home nav: white background + blue logo after scrolling
  var homeNav = document.getElementById('home-nav');
  if (homeNav) {
    var blue = $('.blue-logo', homeNav), white = $('.white-logo', homeNav);
    var onScroll = function () {
      var s = window.scrollY > 100;
      ['shadow-sm', 'dark:bg-bgSecondary', 'bg-white'].forEach(function (c) { homeNav.classList.toggle(c, s); });
      if (blue && white) {
        blue.classList.toggle('hidden', !s); blue.classList.toggle('block', s);
        white.classList.toggle('hidden', s); white.classList.toggle('block', !s);
      }
    };
    window.addEventListener('scroll', onScroll); onScroll();

    // "تواصل معى" (nav + mobile drawer) scrolls to the contact block at the bottom
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a');
      if (!a || a.getAttribute('href') || a.textContent.trim() !== 'تواصل معى') return;
      var target = $('main a[href*="t.me/"]') || $('a[href*="t.me/"]');
      target = target ? (target.closest('section') || target) : null;
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      else window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });

    // mobile drawer
    var drawerT = $('template[data-drawer]');
    var burger = $('.nav-open-icon > button', homeNav);
    if (drawerT && burger) {
      burger.addEventListener('click', function () {
        var holder = document.createElement('div');
        holder.innerHTML = drawerT.innerHTML;
        var root = holder.firstElementChild;
        document.body.appendChild(root);
        var panel = $('[id^=headlessui-dialog-panel]', root);
        root.addEventListener('click', function (e) {
          if (!panel || !panel.contains(e.target) || e.target.closest('a')) root.remove();
        });
      });
    }
  }
  // ---------- Notifications bell (panel nav)
  var userIcon = document.querySelector('nav a.cartIcon');
  if (userIcon) {
    var NOTE = 'تم تأجيل كورس اليوم للمحاضر عبدالعزيز الحماد';
    var BELL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
    var read = false;
    try { read = sessionStorage.getItem('ab-notes-read') === '1'; } catch (e) {}
    var wrap = document.createElement('div');
    wrap.className = 'ab-bell-wrap';
    wrap.innerHTML = '<button type="button" class="ab-bell' + (read ? '' : ' has-unread') + '" aria-label="التنبيهات">' + BELL_SVG + '<span class="ab-bell__badge">1</span></button>' +
      '<div class="ab-notes' + (read ? ' is-read' : '') + '" dir="rtl" role="dialog" aria-label="التنبيهات">' +
      '<div class="ab-notes__head"><span class="ab-notes__title">التنبيهات</span><span class="ab-notes__count">1</span></div>' +
      '<div class="ab-note"><div class="ab-note__icon">' + BELL_SVG + '</div><div class="ab-note__body"><div class="ab-note__msg">' + NOTE + '</div><div class="ab-note__time">اليوم</div></div><span class="ab-note__dot"></span></div>' +
      '</div>';
    userIcon.parentNode.insertBefore(wrap, userIcon);
    var bellBtn = wrap.querySelector('.ab-bell'), box = wrap.querySelector('.ab-notes');
    bellBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = box.classList.toggle('is-open');
      if (open) {
        bellBtn.classList.remove('has-unread');
        try { sessionStorage.setItem('ab-notes-read', '1'); } catch (err) {}
      } else {
        box.classList.add('is-read');
      }
    });
    box.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', function () {
      if (box.classList.contains('is-open')) { box.classList.remove('is-open'); box.classList.add('is-read'); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') box.classList.remove('is-open'); });
  }

  // ---------- Notice toast after logging in (panel.html#login)
  if (location.hash === '#login' && document.querySelector('nav .links')) {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    var t = document.createElement('div');
    t.className = 'ab-toast'; t.setAttribute('role', 'status'); t.setAttribute('dir', 'rtl');
    t.innerHTML = '<div class="ab-toast__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>' +
      '<div class="ab-toast__body"><div class="ab-toast__title"><span class="ab-toast__dot"></span>تنبيه</div>' +
      '<div class="ab-toast__msg">تم تأجيل كورس اليوم للمحاضر عبدالعزيز الحماد</div></div>' +
      '<button class="ab-toast__close" aria-label="إغلاق">&times;</button><div class="ab-toast__bar"></div>';
    var close = function () { if (!t.parentNode || t.classList.contains('is-leaving')) return; t.classList.add('is-leaving'); setTimeout(function () { t.remove(); }, 350); };
    t.querySelector('.ab-toast__close').addEventListener('click', close);
    t.querySelector('.ab-toast__bar').addEventListener('animationend', close);
    setTimeout(function () { document.body.appendChild(t); }, 400);
  }
})();
