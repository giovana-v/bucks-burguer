/* CONFIGURAÇÃO — dados comerciais do site. Fonte única: campo vazio não aparece na tela. */

const BUSINESS_CONFIG = {
  /* ---------- Identificação ---------- */
  name: "Buck's Burguer",

  whatsapp: "5511900000000",

  phone: "",
  email: "",
  instagram: "",

  address: {
    street: "R. Eliza Laurinda da Silva",
    number: "399",
    neighborhood: "Jardim Santana",
    city: "Hortolândia",
    state: "SP",
    zipCode: "13140-252",
    coords: null
  },

  siteUrl: "",

  socialImage: "",

  businessHours: {
    timeZone: "America/Sao_Paulo",
    monday:    { open: "00:00", close: "23:59" },
    tuesday:   { open: "00:00", close: "23:59" },
    wednesday: { open: "00:00", close: "23:59" },
    thursday:  { open: "00:00", close: "23:59" },
    friday:    { open: "00:00", close: "23:59" },
    saturday:  { open: "00:00", close: "23:59" },
    sunday:    { open: "00:00", close: "23:59" }
  },

  delivery: {
    freeRadiusKm: 1.5,
    minimumOrder: null,
    feeRules: []
  }
};

if (typeof module !== 'undefined' && module.exports) module.exports = { BUSINESS_CONFIG };
if (typeof window !== 'undefined') window.BUSINESS_CONFIG = BUSINESS_CONFIG;
