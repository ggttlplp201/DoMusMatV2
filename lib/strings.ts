export const t = {
  priceOnRequest: "Preço sob consulta",
  contactForLeadTime: "Prazo de entrega sob consulta",
  comingSoon: "Coming soon",
  addToQuote: "Adicionar ao orçamento",
  addToBom: "Adicionar à lista de materiais",
  requestCustomPricing: "Pedir preço personalizado",
  vatNote: "Preços líquidos B2B · IVA não incluído · inicie sessão para preços de contrato",
  resultsLabel: "resultados",
  compare: "Comparar",
  savedLists: "Listas guardadas",
} as const;

export const fallbacks = {
  price: "Preço sob consulta",
  leadTime: "Prazo de entrega sob consulta",
  leadTimeDays: (n: number | string) => `${n} dias úteis`,
  bimAsset: "Disponível a pedido",       // BIM/CAD file not yet uploaded
  compliancePending: "Documentação a pedido", // compliance value not published
  installation: "Instruções de instalação a pedido",
  spec: "Sob consulta",                  // generic missing spec value
  eta: "ETA a confirmar",
  stock: "Stock sob consulta",
  none: "—",                              // only for genuinely not-applicable cells
} as const;
