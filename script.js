(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const storage = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    }
  };

  // Year
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile menu
  const mobileBtn = document.querySelector("[data-mobile-menu]");
  const mobileNav = document.getElementById("mobileNav");
  if (mobileBtn && mobileNav) {
    const setOpen = (open) => {
      mobileNav.hidden = !open;
      mobileBtn.setAttribute("aria-expanded", String(open));
    };
    mobileBtn.addEventListener("click", () => {
      const isOpen = mobileBtn.getAttribute("aria-expanded") === "true";
      setOpen(!isOpen);
    });
    $$('[data-mobile-close]').forEach((b) => b.addEventListener("click", () => setOpen(false)));
  }

  // Smooth scroll
  $$('[data-scroll]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const sel = btn.getAttribute("data-scroll");
      const target = document.querySelector(sel);
      if (!target) return;
      const y = target.getBoundingClientRect().top + window.scrollY - 84;
      window.scrollTo({ top: y, behavior: "smooth" });
    });
  });

  // Reveal on scroll
  const revealEls = $$(".reveal");
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.15 }
  );
  revealEls.forEach((el) => io.observe(el));

  // Modal helpers
  function openModal(modal) {
    if (!modal) return;
    modal.hidden = false;
    modal.dataset.open = "true";
    document.body.style.overflow = "hidden";
    // focus first focusable
    const focusable = modal.querySelector(
      'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
    );
    (focusable || modal).focus?.();
  }
  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    modal.dataset.open = "false";
    document.body.style.overflow = "";
  }

  const modals = $$(".modal");

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open-modal]");
    if (btn) {
      const sel = btn.getAttribute("data-open-modal");
      const modal = document.querySelector(sel);
      if (modal) {
        // set plan if provided
        const setPlan = btn.getAttribute("data-set-plan");
        if (modal.id === "subscribeModal" && setPlan) setPlanInForm(setPlan);
        openModal(modal);
      }
    }

    const closer = e.target.closest("[data-close-modal]");
    if (closer) {
      const modal = closer.closest(".modal");
      closeModal(modal);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const open = modals.find((m) => m.dataset.open === "true" || !m.hidden);
    if (open) closeModal(open);

    // Lightbox keyboard arrows
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const galleryOpen = $("#galleryModal") && !$("#galleryModal").hidden;
      if (!galleryOpen) return;
      if (e.key === "ArrowLeft") shiftGallery(-1);
      if (e.key === "ArrowRight") shiftGallery(1);
    }
  });

  // Subscribe logic
  const planInput = $("#planInput");
  const summaryPlan = $("#summaryPlan");
  const summaryAmount = $("#summaryAmount");
  const summaryDuration = $("#summaryDuration");
  const subscribeForm = $("#subscribeForm");
  const subscribeAlert = $("#subscribeAlert");

  const PLAN_MAP = {
    trial: { label: "Free Trial", amount: "₹0", duration: "Assessment + 1 session" },
    monthly: { label: "Monthly Active", amount: "₹2499", duration: "per month" },
    quarterly: { label: "Quarterly Pro", amount: "₹6999", duration: "for 3 months" },
    yearly: { label: "Yearly Elite", amount: "₹24999", duration: "for 12 months" },
    build: { label: "Power & Build", amount: "₹2499", duration: "per month" },
    burn: { label: "Burn & Tone", amount: "₹2499", duration: "per month" },
    core: { label: "Core & Conditioning", amount: "₹2499", duration: "per month" },
    mobility: { label: "Mobility & Stretch", amount: "₹2499", duration: "per month" },
  };

  function setAlert(el, msg, variant) {
    if (!el) return;
    el.textContent = msg;
    el.classList.remove("show", "ok", "err");
    el.classList.add("show");
    if (variant) el.classList.add(variant);
  }

  function setPlanInForm(planKey) {
    const p = PLAN_MAP[planKey] || PLAN_MAP.monthly;
    planInput.value = planKey;
    if (summaryPlan) summaryPlan.textContent = p.label;
    if (summaryAmount) summaryAmount.textContent = p.amount;
    if (summaryDuration) summaryDuration.textContent = p.duration;
  }

  if (planInput) setPlanInForm(planInput.value || "monthly");

  if (subscribeForm) {
    subscribeForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(subscribeForm).entries());

      // basic validation
      const errors = [];
      if (!data.name || data.name.trim().length < 2) errors.push("Enter a valid name.");
      if (!data.phone || data.phone.trim().length < 10) errors.push("Enter a valid phone number.");
      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push("Enter a valid email.");
      if (!data.plan) errors.push("Select a plan.");
      if (!data.batch) errors.push("Select preferred batch.");
      if (!data.goal) errors.push("Select your goal.");

      if (errors.length) {
        setAlert(subscribeAlert, errors[0], "err");
        return;
      }

      const submissions = storage.get("universal_gym_subscriptions", []);
      const entry = {
        ...data,
        createdAt: new Date().toISOString(),
      };
      submissions.unshift(entry);
      storage.set("universal_gym_subscriptions", submissions.slice(0, 20));

      setAlert(
        subscribeAlert,
        `Thanks ${data.name}! Your subscription request for ${PLAN_MAP[data.plan]?.label || data.plan} is saved locally.`,
        "ok"
      );

      // Keep modal open briefly, then close
      setTimeout(() => {
        const modal = document.getElementById("subscribeModal");
        if (modal) closeModal(modal);
        subscribeForm.reset();
        setPlanInForm(entry.plan);
      }, 1200);
    });
  }

  // Gallery lightbox
  const galleryModal = $("#galleryModal");
  const lightboxTile = $("#lightboxTile");
  const gallerySub = $("#gallerySub");
  const prevBtn = $("#galleryPrev");
  const nextBtn = $("#galleryNext");
  const galleryItems = $$('[data-gallery]');

  const GALLERY = {
    1: { title: "Strength Zone", cls: "g1" },
    2: { title: "Cardio Flow", cls: "g2" },
    3: { title: "Free Weights", cls: "g3" },
    4: { title: "Functional Training", cls: "g4" },
    5: { title: "Stretch & Recover", cls: "g5" },
    6: { title: "Community Energy", cls: "g6" },
  };

  let currentGallery = 1;

  function renderGallery(idx) {
    currentGallery = idx;
    const item = GALLERY[idx] || GALLERY[1];
    if (lightboxTile) {
      lightboxTile.className = "lightbox-tile";
      lightboxTile.style.background = "";
      lightboxTile.classList.add(item.cls);
    }
    if (gallerySub) gallerySub.textContent = item.title;
    const tile = lightboxTile;
    if (tile) {
      // set a matching gradient
      const map = {
        g1: "radial-gradient(circle at 20% 20%, rgba(109,91,255,.75), transparent 55%), linear-gradient(135deg, rgba(39,215,255,.25), rgba(255,255,255,.03))",
        g2: "radial-gradient(circle at 20% 20%, rgba(39,215,255,.75), transparent 55%), linear-gradient(135deg, rgba(109,91,255,.22), rgba(255,255,255,.03))",
        g3: "radial-gradient(circle at 20% 20%, rgba(31,227,166,.75), transparent 55%), linear-gradient(135deg, rgba(39,215,255,.18), rgba(255,255,255,.03))",
        g4: "radial-gradient(circle at 20% 20%, rgba(255,92,122,.75), transparent 55%), linear-gradient(135deg, rgba(168,85,247,.18), rgba(255,255,255,.03))",
        g5: "radial-gradient(circle at 20% 20%, rgba(255,200,87,.75), transparent 55%), linear-gradient(135deg, rgba(39,215,255,.18), rgba(255,255,255,.03))",
        g6: "radial-gradient(circle at 20% 20%, rgba(168,85,247,.75), transparent 55%), linear-gradient(135deg, rgba(31,227,166,.18), rgba(255,255,255,.03))",
      };
      tile.style.background = map[item.cls] || map.g1;
    }
  }

  function shiftGallery(delta) {
    let next = currentGallery + delta;
    if (next < 1) next = 6;
    if (next > 6) next = 1;
    renderGallery(next);
  }

  galleryItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      const n = Number(btn.getAttribute("data-gallery"));
      if (!n) return;
      renderGallery(n);
      if (galleryModal) openModal(galleryModal);
    });
  });

  if (prevBtn) prevBtn.addEventListener("click", () => shiftGallery(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => shiftGallery(1));

  // FAQ accordion
  $$(".faq-q").forEach((qBtn) => {
    qBtn.addEventListener("click", () => {
      const expanded = qBtn.getAttribute("aria-expanded") === "true";
      const panelId = qBtn.getAttribute("aria-controls");
      const panel = panelId ? document.getElementById(panelId) : null;
      if (!panel) return;

      // close others (optional)
      $$(".faq-a").forEach((p) => {
        if (p !== panel) {
          p.hidden = true;
          const otherBtn = document.querySelector(`.faq-q[aria-controls="${p.id}"]`);
          if (otherBtn) otherBtn.setAttribute("aria-expanded", "false");
        }
      });

      qBtn.setAttribute("aria-expanded", String(!expanded));
      panel.hidden = expanded;
    });
  });

  // Contact form
  const contactForm = $("#contactForm");
  const contactAlert = $("#contactAlert");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(contactForm).entries());
      const errors = [];
      if (!data.name || data.name.trim().length < 2) errors.push("Enter a valid name.");
      if (!data.phone || data.phone.trim().length < 10) errors.push("Enter a valid phone number.");
      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push("Enter a valid email.");
      if (!data.topic) errors.push("Select a topic.");
      if (!data.message || data.message.trim().length < 10) errors.push("Message must be at least 10 characters.");

      if (errors.length) {
        setAlert(contactAlert, errors[0], "err");
        return;
      }

      const submissions = storage.get("universal_gym_contacts", []);
      submissions.unshift({ ...data, createdAt: new Date().toISOString() });
      storage.set("universal_gym_contacts", submissions.slice(0, 20));

      setAlert(contactAlert, `Thanks ${data.name}! Message stored locally.`, "ok");
      contactForm.reset();
    });
  }

  // Hire a Coach / Pre-Book Membership
  const coachForm = $("#coachForm");
  const coachAlert = $("#coachAlert");
  const coachModal = $("#coachModal");
  const coachActionInput = $("#coachAction");
  const prePlanWrap = $("#prePlanWrap");
  const preDateWrap = $("#preDateWrap");

  function setCoachMode(action) {
    if (!coachActionInput) return;
    coachActionInput.value = action;

    const isPreBook = action === "prebook";
    const title = $("#coachModalTitle");
    const sub = $("#coachModalSub");

    if (title) title.textContent = isPreBook ? "Pre-Book Membership" : "Hire a Coach";
    if (sub) sub.textContent = isPreBook
      ? "Tell us your details. We’ll save your pre-book request locally in this demo."
      : "Tell us your details. We’ll save your request locally in this demo.";

    if (prePlanWrap) prePlanWrap.hidden = !isPreBook;
    if (preDateWrap) preDateWrap.hidden = !isPreBook;

    // clear hidden required fields behavior handled by validation logic below
    // show/hide doesn’t remove 'required' attribute; we validate dynamically.
  }

  if (coachModal) {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-set-coach-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-set-coach-action");
      if (!action) return;
      if (coachModal && !coachModal.hidden) setCoachMode(action);
    });
  }

  if (coachForm) {
    // initialize based on hidden field
    setCoachMode(coachActionInput?.value || "hire");

    // validate on submit
    coachForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const action = coachActionInput?.value || "hire";
      const data = Object.fromEntries(new FormData(coachForm).entries());

      const errors = [];
      if (!data.name || String(data.name).trim().length < 2) errors.push("Enter a valid name.");
      if (!data.phone || String(data.phone).trim().length < 10) errors.push("Enter a valid phone number.");

      if (action === "hire") {
        if (!data.goal) errors.push("Select your fitness goal.");
        if (!data.preferredTime) errors.push("Select preferred training time.");
      }

      if (action === "prebook") {
        if (!data.plan) errors.push("Select a membership plan.");
        if (!data.joinDate) errors.push("Select preferred joining date.");
      }

      if (errors.length) {
        setAlert(coachAlert, errors[0], "err");
        return;
      }

      const key = action === "prebook" ? "universal_gym_prebook" : "universal_gym_coach_hire";
      const submissions = storage.get(key, []);
      submissions.unshift({ ...data, createdAt: new Date().toISOString() });
      storage.set(key, submissions.slice(0, 20));

      setAlert(
        coachAlert,
        action === "prebook"
          ? `Thanks ${data.name}! Pre-book request saved locally.`
          : `Thanks ${data.name}! Coach booking request saved locally.`,
        "ok"
      );

      setTimeout(() => {
        const modal = document.getElementById("coachModal");
        if (modal) closeModal(modal);
        coachForm.reset();
        setCoachMode(action);
      }, 900);
    });
  }

  // Update coach modal when opened
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open-modal='#coachModal']");
    if (!btn) return;
    const action = btn.getAttribute("data-set-coach-action") || "hire";
    setCoachMode(action);
  });

  // Newsletter
  const newsletterForm = $("#newsletterForm");

  const newsletterAlert = $("#newsletterAlert");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(newsletterForm);
      const email = String(fd.get("newsletterEmail") || "").trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setAlert(newsletterAlert, "Enter a valid email.", "err");
        return;
      }
      const subs = storage.get("universal_gym_newsletter", []);
      subs.unshift({ email, createdAt: new Date().toISOString() });
      storage.set("universal_gym_newsletter", subs.slice(0, 30));
      setAlert(newsletterAlert, "Subscribed! (Saved locally in this demo.)", "ok");
      newsletterForm.reset();
    });
  }

})();

