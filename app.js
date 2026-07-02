// Page Loader Screen
window.addEventListener('load', () => {
  const loader = document.getElementById('page-loader');
  if (loader) {
    setTimeout(() => {
      loader.style.opacity = '0';
      setTimeout(() => {
        loader.style.display = 'none';
      }, 800);
    }, 1000); // Gives a smooth luxury branding feel
  }
});

// Interactive Pricing Selection
function selectPricing(packageId, price, packageName, isUserClick = false) {
  // Reset all package selections
  const cards = document.querySelectorAll('.pricing-card');
  cards.forEach(card => {
    card.classList.remove('selected');
  });

  // Highlight chosen card
  const selectedCard = document.querySelector(`.pricing-card[data-package="${packageId}"]`);
  if (selectedCard) {
    selectedCard.classList.add('selected');
  }

  // Sync with package selector options inside the form
  const formOptions = document.querySelectorAll('.form-package-option');
  formOptions.forEach(opt => {
    opt.classList.remove('active');
  });

  const selectedFormOption = document.querySelector(`.form-package-option[data-option-id="${packageId}"]`);
  if (selectedFormOption) {
    selectedFormOption.classList.add('active');
  }

  // Update hidden form inputs
  const inputId = document.getElementById('selectedPackageId');
  const inputName = document.getElementById('selectedPackageName');
  const inputPrice = document.getElementById('selectedPackagePrice');
  
  if (inputId) inputId.value = packageId;
  if (inputName) inputName.value = packageName;
  if (inputPrice) inputPrice.value = price;

  // Update form order summaries
  const labelName = document.getElementById('form-package-name');
  const labelPrice = document.getElementById('form-total-price');
  const labelProductPrice = document.getElementById('form-product-price');
  const labelShippingPrice = document.getElementById('form-shipping-price');
  
  if (labelName) labelName.textContent = packageName;
  if (labelPrice) labelPrice.textContent = `${price} AED`;
  
  if (packageId === 'double') {
    if (labelProductPrice) labelProductPrice.textContent = `239 AED`;
    if (labelShippingPrice) labelShippingPrice.innerHTML = `<span style="color: #22c55e;"><i class="fa-solid fa-circle-check"></i> شحن مجاني</span>`;
  } else {
    if (labelProductPrice) labelProductPrice.textContent = `130 AED`;
    if (labelShippingPrice) labelShippingPrice.textContent = `19 AED`;
  }

  // If clicked from the top cards, scroll to the form section and focus client name
  if (isUserClick) {
    const checkoutSection = document.getElementById('checkout-form-section');
    if (checkoutSection) {
      checkoutSection.scrollIntoView({ behavior: 'smooth' });
      const nameInput = document.getElementById('clientName');
      if (nameInput) {
        setTimeout(() => {
          nameInput.focus();
        }, 800); // Allow time for scroll transition
      }
    }
  }
}

// Scroll Reveal Animations
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  
  function checkReveal() {
    const windowHeight = window.innerHeight;
    reveals.forEach(element => {
      const elementTop = element.getBoundingClientRect().top;
      const revealPoint = 100; // Trigger threshold
      
      if (elementTop < windowHeight - revealPoint) {
        element.classList.add('active');
      }
    });
  }

  window.addEventListener('scroll', checkReveal);
  checkReveal(); // Trigger once on load
}

// Sticky CTA Bar toggler
function initStickyCta() {
  const stickyBar = document.getElementById('sticky-cta');
  const heroSection = document.querySelector('.hero');
  
  if (!stickyBar || !heroSection) return;

  window.addEventListener('scroll', () => {
    const heroHeight = heroSection.offsetHeight;
    const scrollPosition = window.scrollY;

    // Show sticky bar only when scrolled past the hero section
    if (scrollPosition > heroHeight - 100) {
      stickyBar.classList.add('show');
    } else {
      stickyBar.classList.remove('show');
    }
  });
}

// Interactive Anatomy Component ("Ingredients")
function initAnatomySelector() {
  const items = document.querySelectorAll('.anatomy-item');
  const viewerImage = document.getElementById('anatomy-image');

  items.forEach(item => {
    item.addEventListener('click', () => {
      // Remove active class from all
      items.forEach(i => i.classList.remove('active'));
      
      // Highlight clicked item
      item.classList.add('active');

      // (Optional) Here you can change viewer image based on the data-target attribute
      const target = item.getAttribute('data-target');
      console.log(`Highlighted anatomy target: ${target}`);
      // If we had separate image files for each highlight, we could swap here:
      // viewerImage.src = `luxury_car_washer_${target}.png`;
    });
  });
}

// Interactive Before/After Image Slider
function initBeforeAfterSlider() {
  const slider = document.getElementById('before-after-slider');
  const afterImage = document.getElementById('after-image-clip');
  const handle = document.getElementById('slider-handle');

  if (!slider || !afterImage || !handle) return;

  let isDragging = false;

  function moveSlider(x) {
    const rect = slider.getBoundingClientRect();
    let position = ((x - rect.left) / rect.width) * 100;
    
    // Boundary checks
    if (position < 0) position = 0;
    if (position > 100) position = 100;
    
    afterImage.style.width = `${position}%`;
    handle.style.left = `${position}%`;
  }

  // Mouse Events
  slider.addEventListener('mousedown', (e) => {
    isDragging = true;
    moveSlider(e.clientX);
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    moveSlider(e.clientX);
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Touch Events (Mobile)
  slider.addEventListener('touchstart', (e) => {
    isDragging = true;
    moveSlider(e.touches[0].clientX);
  });

  window.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    moveSlider(e.touches[0].clientX);
  });

  window.addEventListener('touchend', () => {
    isDragging = false;
  });
}

// Customer Reviews Fade Carousel
function initReviewsSlider() {
  const slides = document.querySelectorAll('.review-slide');
  if (slides.length === 0) return;

  let currentIndex = 0;

  setInterval(() => {
    // Hide active slide
    slides[currentIndex].classList.remove('active');
    
    // Increment index
    currentIndex = (currentIndex + 1) % slides.length;
    
    // Show next slide
    slides[currentIndex].classList.add('active');
  }, 6000); // Shifts reviews every 6 seconds
}

// FAQ Accordion
function initFaqAccordion() {
  const cards = document.querySelectorAll('.faq-card');
  
  cards.forEach(card => {
    const btn = card.querySelector('.faq-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const isOpen = card.classList.contains('open');
      
      // Close all FAQs first
      cards.forEach(c => c.classList.remove('open'));
      
      // Toggle current card
      if (!isOpen) {
        card.classList.add('open');
      }
    });
  });
}

// Live Social Proof Notification Popups
const emirateNames = ["سلطان الشامسي", "خالد الحمادي", "فيصل المنصوري", "محمد الكتبي", "راشد الفلاسي", "سعيد الظاهري", "زايد الرميثي", "أحمد الكعبي", "عبدالله المري", "حمد المهيري"];
const emirateCities = ["دبي", "أبوظبي", "الشارقة", "العين", "عجمان", "رأس الخيمة", "الفجيرة"];
const pricingPackages = [
  { name: "الحزمة المزدوجة - جهازين" },
  { name: "الحزمة الأساسية" },
  { name: "الحزمة المزدوجة - جهازين" }, // Higher weight
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function startLivePurchases() {
  const toast = document.getElementById('purchase-toast');
  const toastText = document.getElementById('toast-text');

  if (!toast || !toastText) return;

  // Trigger first after 12 seconds
  setTimeout(triggerToast, 12000);

  function triggerToast() {
    const name = getRandomItem(emirateNames);
    const city = getRandomItem(emirateCities);
    const packageInfo = getRandomItem(pricingPackages);
    const minAgo = Math.floor(Math.random() * 4) + 1; // 1 to 4 minutes ago

    toastText.innerHTML = `قام <strong>${name}</strong> من <strong>${city}</strong> بشراء <strong>${packageInfo.name}</strong> قبل ${minAgo} دقائق!`;
    
    // Slide in
    toast.classList.add('show');

    // Slide out after 6 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      
      // Schedule next toast between 20 and 35 seconds
      const nextDelay = (Math.floor(Math.random() * 15) + 20) * 1000;
      setTimeout(triggerToast, nextDelay);
    }, 6000);
  }
}

// UAE provinces and regions map
const UAE_REGIONS = {
  "أبوظبي": [
    "أبوظبي المدينة (Abu Dhabi City)",
    "العين (Al Ain)",
    "الظفرة / المنطقة الغربية (Al Dhafra)",
    "مصفح (Mussafah)",
    "جزيرة ياس (Yas Island)",
    "خليفة أ (Khalifa City A)",
    "الشامخة (Al Shamkha)",
    "بني ياس (Baniyas)"
  ],
  "دبي": [
    "ديرة (Deira)",
    "بر دبي (Bur Dubai)",
    "جبل علي (Jebel Ali)",
    "البرشاء (Al Barsha)",
    "مرسى دبي / جي بي آر (Dubai Marina / JBR)",
    "المدينة العالمية (International City)",
    "واحة دبي للسيليكون (Silicon Oasis)",
    "القصيص (Al Qusais)",
    "حتا (Hatta)"
  ],
  "الشارقة": [
    "الشارقة المدينة (Sharjah City)",
    "الذيد (Al Dhaid)",
    "خورفكان (Khor Fakkan)",
    "كلباء (Kalba)",
    "القرائن (Al Qarayen)",
    "الرحمانية (Al Rahmaniya)"
  ],
  "عجمان": [
    "عجمان المدينة (Ajman City)",
    "مصفوت (Masfout)",
    "المنامة (Al Manama)",
    "الجرف (Al Jurf)",
    "النعيمية (Al Nuaimiya)"
  ],
  "أم القيوين": [
    "أم القيوين المدينة (Umm Al Quwain City)",
    "فلج المعلا (Falaj Al Mualla)",
    "السلمة (Al Salama)"
  ],
  "رأس الخيمة": [
    "رأس الخيمة المدينة (Ras Al Khaimah City)",
    "الجزيرة الحمراء (Al Jazirah Al Hamra)",
    "مسافي (Masafi)",
    "الدقداقة (Diqdaqah)"
  ],
  "الفجيرة": [
    "الفجيرة المدينة (Fujairah City)",
    "دبا الفجيرة (Dibba Al-Fujairah)",
    "قدفع (Qidfa)",
    "مربح (Merbah)"
  ]
};

// Form Submission & Order Validation
function initOrderForm() {
  const form = document.getElementById('luxuryOrderForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    
    const emirate = document.getElementById('clientEmirate').value;
    const city = emirate;

    const address = document.getElementById('clientAddress').value.trim();
    const packageId = document.getElementById('selectedPackageId').value;
    const packageName = document.getElementById('selectedPackageName').value;
    const packagePrice = parseFloat(document.getElementById('selectedPackagePrice').value);

    // UAE phone validation (starting with 05 or 5, checking length of 9 to 10 digits)
    const phonePattern = /^(05|5)[0-9]{8}$/;
    if (!phonePattern.test(phone)) {
      alert('يرجى إدخال رقم هاتف إماراتي صحيح يبدأ بـ 05 أو 5 ومكون من 9 أو 10 أرقام (مثل: 0501234567)');
      return;
    }

    // Build order model
    const order = {
      id: 'AE-' + Math.floor(100000 + Math.random() * 900000),
      name: name,
      phone: phone,
      city: city,
      address: address,
      packageId: packageId,
      packageName: packageName,
      price: packagePrice,
      status: 'جديد',
      date: new Date().toLocaleString('ar-AE', { timeZone: 'Asia/Dubai' })
    };

    // Save locally
    let localOrders = JSON.parse(localStorage.getItem('orders')) || [];
    localOrders.unshift(order);
    localStorage.setItem('orders', JSON.stringify(localOrders));
    localStorage.setItem('lastOrder', JSON.stringify(order));

    // Post to backend server API
    fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(order)
    })
    .then(res => {
      if (!res.ok) throw new Error('API server unavailable');
      return res.json();
    })
    .then(data => {
      console.log('Order successfully synced to local API database:', data);
    })
    .catch(err => {
      console.warn('API sync failed. Order saved to localStorage only:', err);
    })
    .finally(() => {
      // Redirect to confirmation thankyou page
      window.location.href = 'thankyou.html';
    });
  });
}

// Initialise everything
document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initStickyCta();
  initAnatomySelector();
  initBeforeAfterSlider();
  initReviewsSlider();
  initFaqAccordion();
  initOrderForm();
  startLivePurchases();
  initTikTokPixel();

  // Set default package selection to Double package (239 AED)
  selectPricing('double', 239, 'الحزمة المزدوجة - جهازين (المعززة)');
});

// Dynamic TikTok Pixel Initialisation
function initTikTokPixel() {
  fetch('/api/settings')
    .then(res => res.json())
    .then(data => {
      if (data.success && data.tiktok_pixel_id) {
        const pixelId = data.tiktok_pixel_id.trim();
        if (!pixelId) return;

        console.log('[TikTok Pixel] Initialising with ID:', pixelId);
        
        !function (w, d, t) {
          w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","cleanCookie","useCookie","setCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var e=0;e<ttq.methods.length;e++)ttq.setAndDefer(ttq,ttq.methods[e]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n;var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
          
          ttq.load(pixelId);
          ttq.page();
        }(window, document, 'ttq');
      }
    })
    .catch(err => {
      console.warn('[TikTok Pixel] Settings loading failed:', err);
    });
}
