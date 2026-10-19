/* ============================================
   EVERTON BRITO — PORTFOLIO
   Main JavaScript (Kinetic Version)
   ============================================ */

// ---- i18n Translations ----
const translations = {
  'pt-BR': {
    'nav.about': 'Sobre',
    'nav.services': 'Serviços',
    'nav.portfolio': 'Portfólio',
    'nav.contact': 'Contato',
    'nav.cta': 'Contato',
    'hero.available': 'Disponível globalmente',
    'hero.title': 'Criando<br><span class="serif">experiências</span><br>digitais',
    'hero.description': 'Transformo ideias em sites e landing pages estratégicas que conectam marcas a pessoas em qualquer lugar do mundo.',
    'hero.cta': 'Solicite um Orçamento',
    'hero.card_title': 'UX & UI Design',
    'hero.card_desc': 'Layouts modernos e centrados no usuário.',
    'about.label': 'Sobre',
    // Complex HTML for statement to preserve inline icons and structure
    'about.statement': `<strong>Everton Brito</strong> — é parceiro estratégico de quem busca <span class="serif">resultado</span>. De iniciantes a grandes players, entrego projetos que <svg class="brand-icon inline-icon" style="color: var(--accent);" aria-hidden="true"><use href="#icon-triangle"/></svg> <strong>funcionam</strong> e impulsam negócios no <span class="serif">digital</span>`,
    'about.sub': '6+ anos guiando clientes de diversos níveis de consciência digital. Seja para lançar sua primeira página ou escalar uma operação complexa, o objetivo é um só: clareza e conversão.',
    'services.label': 'Serviços',
    'services.title': 'O que eu <span class="serif">faço</span>',
    'services.s1.title': 'Páginas de Vendas',
    'services.s1.desc': 'Landing pages persuasivas e de alta conversão. Estrutura validada para capturar leads e maximizar o ROI do seu tráfego.',
    'services.s2.title': 'UX / UI Design',
    'services.s2.desc': 'Layouts modernos que unem estética e função. Do wireframe ao protótipo final, garantindo usabilidade impecável.',
    'services.s3.title': 'Sites Institucionais',
    'services.s3.desc': 'Presença digital sólida e profissional. Sites rápidos, otimizados e responsivos que transmitem autoridade imediata.',
    'services.s4.title': 'Páginas de Captura',
    'services.s4.desc': 'Squeeze pages focadas em uma única ação. Design minimalista e direto ao ponto para aumentar sua taxa de cadastro.',
    'services.s5.title': 'Consultoria',
    'services.s5.desc': 'Análise técnica e estratégica do seu produto digital. Identificação de gargalos de usabilidade que estão custando vendas.',
    'services.s6.title': 'Mentoria',
    'services.s6.desc': 'Orientação personalizada para designers e infoprodutores que desejam elevar o nível visual e técnico de seus projetos.',
    'portfolio.label': 'Portfólio',
    'portfolio.title': 'Projetos <span class="serif">selecionados</span>',
    'portfolio.cta': 'Iniciar um projeto',
    'portfolio.placeholder': 'Em breve',
    'cta.label': 'Contato',
    'cta.title': 'Vamos criar algo<br><span class="serif">incrível</span> juntos?',
    'cta.description': 'Tem um desafio de negócio? Preencha o formulário abaixo e vamos discutir a solução ideal via WhatsApp.',
    'form.name_label': 'Nome',
    'form.name_placeholder': 'Seu nome',
    'form.email_label': 'Email',
    'form.whatsapp_label': 'WhatsApp',
    'form.whatsapp_placeholder': 'DDD + Número',
    'form.project_label': 'Tipo de Projeto',
    'form.project_placeholder': 'Ex: Landing Page, Site Institucional...',
    'form.message_label': 'Mensagem',
    'form.message_placeholder': 'Conte um pouco sobre seu projeto...',
    'form.submit': 'Enviar mensagem',
    'footer.rights': 'Todos os direitos reservados.',
    'footer.top': 'Voltar ao topo',
  },
  'en': {
    'nav.about': 'About',
    'nav.services': 'Services',
    'nav.portfolio': 'Portfolio',
    'nav.contact': 'Contact',
    'nav.cta': 'Contact',
    'hero.available': 'Available globally',
    'hero.title': 'Creating<br>digital<br><span class="serif">experiences</span>',
    'hero.description': 'I turn ideas into strategic sites and landing pages that connect brands to people anywhere in the world.',
    'hero.cta': 'Get a Quote',
    'hero.card_title': 'UX & UI Design',
    'hero.card_desc': 'Modern layouts focused on user experience.',
    'about.label': 'About',
    'about.statement': `<strong>Everton Brito</strong> — is a strategic partner for those seeking <span class="serif">results</span>. From beginners to major players, I deliver projects that <svg class="brand-icon inline-icon" style="color: var(--accent);" aria-hidden="true"><use href="#icon-triangle"/></svg> <strong>work</strong> and boost business in the <span class="serif">digital</span> space`,
    'about.sub': '6+ years guiding clients across various digital maturity levels. Whether launching your first page or scaling a complex operation, the goal is one: clarity and conversion.',
    'services.label': 'Services',
    'services.title': 'What I <span class="serif">do</span>',
    'services.s1.title': 'Sales Pages',
    'services.s1.desc': 'High-converting persuasive landing pages. A validated structure to capture leads and maximize your traffic ROI.',
    'services.s2.title': 'UX / UI Design',
    'services.s2.desc': 'Modern layouts merging aesthetics and function. From wireframe to final prototype, ensuring flawless usability.',
    'services.s3.title': 'Corporate Websites',
    'services.s3.desc': 'Solid and professional digital presence. Fast, optimized, and responsive sites that convey immediate authority.',
    'services.s4.title': 'Lead Capture Pages',
    'services.s4.desc': 'Squeeze pages focused on a single action. Minimalist and direct design to boost your signup rate.',
    'services.s5.title': 'Consulting',
    'services.s5.desc': 'Technical and strategic analysis of your digital product. Identifying usability bottlenecks that are costing you sales.',
    'services.s6.title': 'Mentoring',
    'services.s6.desc': 'Personalized guidance for designers and creators who want to elevate the visual and technical level of their projects.',
    'portfolio.label': 'Portfolio',
    'portfolio.title': '<span class="serif">Selected</span> projects',
    'portfolio.cta': 'Start a project',
    'portfolio.placeholder': 'Coming soon',
    'cta.label': 'Contact',
    'cta.title': 'Let\'s create something<br><span class="serif">amazing</span> together?',
    'cta.description': 'Have a business challenge? Fill out the form below and let\'s discuss the ideal solution via WhatsApp.',
    'form.name_label': 'Name',
    'form.name_placeholder': 'Your name',
    'form.email_label': 'Email',
    'form.whatsapp_label': 'WhatsApp',
    'form.whatsapp_placeholder': 'Area Code + Number',
    'form.project_label': 'Project Type',
    'form.project_placeholder': 'E.g.: Landing Page, Corporate Website...',
    'form.message_label': 'Message',
    'form.message_placeholder': 'Tell me a bit about your project...',
    'form.submit': 'Send message',
    'footer.rights': 'All rights reserved.',
    'footer.top': 'Back to top',
  }
};

let currentLang = 'pt-BR';

// ---- Initialize ----
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileMenu();
  initLanguageToggle();
  initScrollReveal();
  initContactForm();
});

// ---- Navbar Scroll Effect ----
function initNavbar() {
  const navbar = document.getElementById('navbar');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;

    // Add background on scroll or mobile menu open
    if (currentScroll > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
  }, { passive: true });
}

// ---- Mobile Menu ----
function initMobileMenu() {
  const toggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('mobile-menu');
  const links = menu.querySelectorAll('.mobile-menu__link');

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    menu.classList.toggle('active');
    document.body.style.overflow = menu.classList.contains('active') ? 'hidden' : '';
  });

  links.forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('active');
      menu.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
}

// ---- Language Toggle ----
function initLanguageToggle() {
  const toggleDesktop = document.getElementById('lang-toggle');
  const toggleMobile = document.getElementById('lang-toggle-mobile');

  function switchLanguage() {
    currentLang = currentLang === 'pt-BR' ? 'en' : 'pt-BR';
    const buttonText = currentLang === 'pt-BR' ? 'EN' : 'PT';

    toggleDesktop.textContent = buttonText;
    toggleMobile.textContent = buttonText;

    // Update HTML lang attribute
    document.documentElement.lang = currentLang === 'pt-BR' ? 'pt-BR' : 'en';

    // Translate all elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (translations[currentLang][key]) {
        // Direct HTML replacement since formatting is handled in translation strings
        el.innerHTML = translations[currentLang][key];
      }
    });

    // Translate placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (translations[currentLang][key]) {
        el.placeholder = translations[currentLang][key];
      }
    });
  }

  toggleDesktop.addEventListener('click', switchLanguage);
  toggleMobile.addEventListener('click', switchLanguage);
}

// ---- Scroll Reveal ----
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal, .reveal-stagger');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  reveals.forEach(el => observer.observe(el));
}

// ---- Brazilian Phone Mask ----
function initPhoneMask() {
  const input = document.getElementById('whatsapp');
  if (!input) return;

  input.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '');     // only digits
    if (v.length > 11) v = v.slice(0, 11);          // max 11 digits

    if (v.length > 6) {
      v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    } else if (v.length > 2) {
      v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    } else if (v.length > 0) {
      v = `(${v}`;
    }

    e.target.value = v;
  });
}

// ---- Contact Form → Email + WhatsApp ----
function initContactForm() {
  const form = document.getElementById('contact-form');

  // WhatsApp Number (your number)
  const WHATSAPP_NUMBER = '5571999261967';

  // Init phone mask
  initPhoneMask();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const whatsapp = document.getElementById('whatsapp').value.trim();
    const project = document.getElementById('project').value.trim();
    const message = document.getElementById('message').value.trim();

    // Validate phone (must have 11 digits)
    const phoneDigits = whatsapp.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      alert(currentLang === 'pt-BR'
        ? 'Informe um número de WhatsApp válido com DDD.'
        : 'Please enter a valid WhatsApp number with area code.');
      return;
    }

    // Update button state
    const btn = form.querySelector('button[type="submit"]');
    const btnOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = currentLang === 'pt-BR' ? 'Enviando...' : 'Sending...';

    // Send to PHP backend (email)
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('whatsapp', whatsapp);
      formData.append('project', project);
      formData.append('message', message);

      await fetch('send-form.php', {
        method: 'POST',
        body: formData
      });
    } catch (err) {
      console.warn('Email send failed:', err);
    }

    // Build WhatsApp message
    let waMessage = currentLang === 'pt-BR'
      ? 'Olá Everton,\n\nVim do site e acabei de preencher o formulário de contato'
      : 'Hi Everton,\n\nI came from the website and just filled out the contact form';

    const encodedMessage = encodeURIComponent(waMessage);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');

    // Restore button
    btn.disabled = false;
    btn.innerHTML = btnOriginal;

    // Reset form
    form.reset();
  });
}
