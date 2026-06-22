# DoMusMat real catalogue (crawled from domusmat.pt, 2026-06-22)

Source of truth for the multi-product catalogue. **Real data only** — every field
here was published on the site. Anything not listed is `"PLACEHOLDER"` (esp. all
prices: the site publishes NONE — quote-on-request sitewide). Site is WooCommerce,
server-rendered. Images are hosted under `https://domusmat.pt/wp-content/uploads/...`.

Shared rules for the JSON build:
- Prices: ALL `"PLACEHOLDER"`; `currency` `"PLACEHOLDER"`.
- Where a product has multiple power/size SKUs, each SKU is a **variant**.
- `model3d`: only the Barra LED High Bay has a GLB (`/models/high_bay_led_bar.glb`); all others `"PLACEHOLDER"`.
- Compliance: map published certs (CE, RoHS, ETL, FCC), fire ratings, acoustic, security/thermal classes into the compliance fields; everything else `"PLACEHOLDER"`.

## Categories (slug → name)
- `iluminacao-led` → Iluminação LED
- `pavimentos` → Pavimentos
- `rodapes` → Rodapés
- `carpintaria` → Carpintaria à Medida
- `drenagem` → Drenagem
- `portas` → Portas
- `serralharia` → Serralharia
- `espelhos` → Espelhos Inteligentes

---

## 1. Iluminação LED (12 products)

### Balizador de Jardim LED — `DMSL-OL12W004`
12W · AC 220–240V · 2700/3000/4000/5000/6000K · 240lm · 180° simétrico · CRI≥80 · IP65 · Alumínio · Branco/Preto · Ø108×600mm · CE,RoHS
img: /wp-content/uploads/2025/07/Iluminacao-LED_Balizadores_cam-01_Produto-Ambiente-scaled.jpg

### Barra LED High Bay — variants `DMJR-TP120W001`(120W,600×150×67), `DMJR-TP150W002`(150W,900×150×67), `DMJR-TP200W003`(200W,1200×150×67), `DMJR-TP300W004`(300W,1500×150×67)
120–277V · IP65 · 3000/4000/5000K · CRI83 · 120° · 130–135lm/W · Alumínio · Branco · A+ · CE,RoHS,ETL,FCC · 3yr warranty · **model3d: /models/high_bay_led_bar.glb**
(This is the existing datasheet product — keep full specs from data/ original.)

### Barra Linear LED 40W/50W — variants `DMRS-LL40W001`(40W,5400lm,1150×50×75), `DMRS-LL50W002`(50W,6750lm,1435×50×75)
220–240V · 3000/4000/5000/6000K · CRI≥80 · IP20 · Alumínio/PC · Branco/Preto · SMD2835 · 30000h · A+ · CE,RoHS
img: /wp-content/uploads/2025/07/Iluminacao-LED_Linear-40w-50w_Produto-Ambiente-01-1440x1800.jpg

### Barra Linear LED 45W c/ sensor — `DMRS-LL45W003`
45W · 3400lm · 220–240V · 3000/4000/6000K · 10/24/36/48/10×35° · CRI80 · IP20 · Alumínio+PC · Branco/Preto · A+ · CE,RoHS · 1173×35×75mm
img: /wp-content/uploads/2025/07/Iluminacao-LED_Linear-45w_Produto-Ambiente-01-scaled.jpg

### Barra Linear LED Fina c/ sensor — variants `DMRS-LL28W004A`(2300/900lm,1175×11×60), `DMRS-LL28W004B`(1600/720lm,1225×11×60)
28W · 220–240V · 3000/4000/6000K · CRI≥90 · IP20 · Alumínio+PC · Branco/Preto/Dourado · A+ · CE,RoHS

### Barra Linear LED Tri-Proof — variants `DMJR-TP20W008`(20W,600×75×63), `DMJR-TP40W009`(40W,1200×75×63), `DMJR-TP60W010`(60W,1500×75×63), `DMJR-TP80W011`(80W,2400×75×63)
220–240V · IP66 · 3000/4000/5000K · 130–135lm/W · 120° · CRI83 · Branco · PC+UV-resistant · A+ · CE,RoHS,ETL,FCC
img: /wp-content/uploads/2025/07/Iluminacao-LED_Industrial-Linear_Produto-Ambiente-01-scaled.jpg

### Barra Linear LED Ultrafina Tri-Proof — variants `DMJR-TP20W005`(20W,600×125×45), `DMJR-TP36W006`(36W,1200×125×45), `DMJR-TP50W007`(50W,1500×125×45)
220–240V · 3000/4000/5000/6000K · 130–135lm/W · 120° · CRI83 · IP65 · Branco · PVC+PC/PMMA · A+ · CE,RoHS,ETL,FCC
img: /wp-content/uploads/2025/07/Iluminacao-LED_Industrial-Linear-Ultrafino_Produto-Ambiente-01-1440x1800.jpg

### Foco de Encastrar LED circular (exterior) — variants `DMSL-OL06W001`(6W,360lm,Ø120×90), `DMSL-OL09W002`(9W,540lm,Ø160×90), `DMSL-OL12W003`(12W,720lm,Ø180×95)
AC220–240V · 2700/3000/4000/5000/6000K · 15/27/60° · CRI≥80 · IP65 · Inox+alumínio+vidro+plástico · Branco/Preto · CE,RoHS
img: /wp-content/uploads/2025/07/Iluminacao-LED_Foco_cam-01_Produto-Ambiente-scaled-1440x1800.jpg

### Foco de Encastrar LED quadrado (exterior) — variants `DMSL-OL03W008`(3W,240lm,100×100×75), `DMSL-OL06W009`(6W,480lm,140×140×80), `DMSL-OL09W010`(9W,720lm,160×160×80)
220–240V · IP65 · 2700/3000/4000/5000/6000K · CRI≥80Ra · 8/15/30/45/60/90/120° · Alumínio+inox+vidro+plástico · Preto · A+ · CE,RoHS

### Luminária LED Ampla (downlight) — variants `DMRS-CL10W007B`(10W,900lm,Ø97×62), `DMRS-CL20W008B`(20W,1600lm,Ø117×62), `DMRS-CL28W009B`(28W,2400lm,Ø139×82)
180–265V 50–60Hz · 3000–5000K · CRI≥90 · 20/40° · IP44 · Alumínio/PC · A+ · CE,RoHS

### Luminária LED Embutida IP65 — variants `DMSL-CL10W013`(10W,700lm,Ø88×62), `DMSL-CL14W014`(14W,980lm,Ø110×74), `DMSL-CL20W015`(20W,1400lm,Ø142×86)
AC220–240V · 2700/3000/4000/6000K · 20/40/60° · CRI>90Ra · IP65 · Alumínio · CE,RoHS
img: /wp-content/uploads/2025/09/Iluminacao-LED_Teto-Embutida-10w14w20w_Produto-Ambiente-02-scaled.jpg

### Luminária LED Embutida IP20 — variants `DMRS-CL10W001`(10W,1050lm,Ø92×50), `DMRS-CL15W002`(15W,1575lm,Ø114×53), `DMRS-CL20W003`(20W,2100lm,Ø140×59)
220–240V · 3000/4000/5000K · 110° · CRI80/90/97 · IP20 · Alumínio+PC · A+ · CE,RoHS

---

## 2. Pavimentos (5 products)

### Carvalho (madeira) — variants `DMSC-PC202401A`, `DMSC-PC202401B`
Carvalho multicamadas · lamela 3/4mm · total 15mm · click · liso/escovado verniz UV · 1900×190 ou 2200×260mm
img: /wp-content/uploads/2025/07/Pavimento_ProdutoDestaque_Carvalho-scaled.jpg

### Nogueira (madeira) — `DMSC-PN202403`
Nogueira multicamadas · lamela 3/4mm · total 15mm · simples · verniz+óleo natural · 600×90 ou 1900×190mm
img: /wp-content/uploads/2025/10/Pavimento_Produto-Ambiente-01_Nogueira_cam-02-2-scaled.jpg

### Teca (madeira) — `DMSC-PT202404`
Teca multicamadas · lamela 3/4mm · total 15mm · click · verniz+óleo natural · 600×90 ou 1900×190mm
img: /wp-content/uploads/2025/07/Pavimento_ProdutoDestaque_Teca-scaled.jpg

### Pavimento ABA (vinílico) — `DMSD-PABA202501`
Vinílico multicamadas · 1200×180mm · 6/8/10mm · subcamada acústica 1/2mm opc · click macho-fêmea · texturado · cores carvalho
img: /wp-content/uploads/2025/10/Pavimento_Produto-Ambiente-02_ABA-Vinilico_Florenca_cam-02-1-scaled.jpg

### Pavimento SPC (vinílico) — `DMSD-PSPC202501`
Núcleo rígido · 1200×180mm · 3.5/4/5/6mm · subcamada acústica 1/2mm opc · click · texturado · cores carvalho
img: /wp-content/uploads/2025/10/Pavimento_Produto-Ambiente-02_SPC-Vinilico_Veneza_cam-02-2-scaled.jpg

---

## 3. Rodapés (2 products)

### Rodapé Oculto — `DMJQ-RP202402`
MDF · folha madeira c/ verniz OU pintura lacada · cola PUR · 2400±5 × (80 ou 100)±1 × 12±0.5mm
img: /wp-content/uploads/2025/07/Rodape-Oculto_Produto-Ambiente_cam-01-scaled-1440x1800.jpg

### Rodapé Simples — `DMJQ-RP202401`
MDF · laminado CPL/pintura lacada · cola PUR · 2400±5 × (80 ou 100)±1 × 12±0.5mm
img: /wp-content/uploads/2025/07/Rodape-Simples_Produto-Ambiente_cam-01-scaled-1440x1800.jpg

---

## 4. Carpintaria à Medida (3 products — bespoke, no SKU)

### Armário de Casa de Banho — ref PLACEHOLDER
Estrutura aglomerado · portas MDF · acab. melamina/CPL/lacado · prof 550/600 · módulo base 300mm · portas alt 600/2400, larg 300/600, esp 18/25mm · dobradiças ocultas/soft-close

### Armário de Cozinha — ref PLACEHOLDER
(same construction as above)

### Roupeiro — ref PLACEHOLDER
(same construction as above)

---

## 5. Drenagem (3 products — no SKU)

### Canais de Drenagem BMC — ref PLACEHOLDER
Resina composta/BMC · conexão simples · classe carga B125/C250 · cor natural · perfil em U
img: /wp-content/uploads/2025/07/Drenagem_Canal_Produto-Categoria-Ambiente-scaled-1440x810.jpg

### Grelha de Drenagem Aço Inox — ref PLACEHOLDER
Aço inoxidável · conexão simples · B125/C250 · cor natural
img: /wp-content/uploads/2025/07/Drenagem_Grelha-de-Aco_Produto-Categoria-Ambiente-scaled-1440x810.jpg

### Grelha de Drenagem BMC — ref PLACEHOLDER
Resina composta/BMC · conexão simples · B125/C250 · cor natural
img: /wp-content/uploads/2025/07/Drenagem_Grelha-BMC_Produto-Categoria-Ambiente-scaled-1440x810.jpg

---

## 6. Portas (12 products)

### Porta Batente — variants `DMJQ-PB202401A`, `DMJQ-PB202401B`
MDF/CPL/LVL · laminado/lacada · aro 60 ou 80mm · 2200±1(máx2350) × 900±1(máx1200) · folha 41±0.5mm · parede ≥100mm · inclui puxadores/fechadura/dobradiças
img: /wp-content/uploads/2025/07/Porta-de-Batente_Produto-Ambiente-01-scaled-1440x1800.jpg

### Porta Batente C — variants `DMJQ-PB202402A`, `DMJQ-PB202402B`  (detalhe circular; specs idênticas à Porta Batente)
### Porta Batente T — variants `DMJQ-PB202403A`, `DMJQ-PB202403B`  (detalhe triangular; specs idênticas)

### Porta de Correr (cassete/bolso, aro oculto) — `DMJQ-PC202401`
MDF/CPL/LVL · laminado/lacada · aro 60/80mm · 2200±1 × 900±1 · folha 41±0.5mm · parede ≥175mm · inclui ferragens de correr

### Porta de Entrada Classe 3 — `DMDLJ-PE202501`
Resistance Class 3 · ruído até 42dB · U 1.7–1.0 W/m²K · ar Classe4 · água Classe4A · vento C5 · corpo galvanizado · 80/85/90×200/210/220cm · cert. eficiência energética

### Porta de Entrada Class 4 — `DMDLJ-PE202502`
Class 4 (ENV1627) · aço galvanizado · 80/85/90×210cm · isolamento térmico reforçado

### Porta Corta-Fogo 1 folha — `DMXD-PCF202502A`
Resist. fogo 30min–2h · UL10B/UL10C/NFPA-252/EN-1634-1/BS-476-22 · cert UL/EN · bandeira opcional

### Porta Corta-Fogo 1 folha c/ visor — `DMXD-PCF202501A`  (+ vidro resistente ao fogo)
img: /wp-content/uploads/2025/07/Porta-Corta-Fogo-1-Folha-com-Visor_Produto-Ambiente-01-scaled-1440x1800.jpg
### Porta Corta-Fogo 2 folhas — `DMXD-PCF202502B`
### Porta Corta-Fogo 2 folhas c/ visor — `DMXD-PCF202501B`
(All corta-fogo share: fogo 30min–2h, same norms, UL/EN.)

### Porta Multiusos (arrecadação) — `DMXD-PM202501`  · dimensões sob consulta
### Porta de Ventilação (grelha/persianas) — `DMXPC-PV202501`  · dimensões sob consulta

---

## 7. Serralharia (1 product)

### Guarda-Corpos Aço/Inox — ref PLACEHOLDER
Aço S275 JR galvanizado · aço pintado opc · cor/dimensões sob consulta
img: /wp-content/uploads/2025/10/Serralharia_Guarda-Corpos_Produto-Ambiente-scaled-1440x1800.jpg

---

## 8. Espelhos Inteligentes (9 products)

**Shared specs (all mirrors):** PET técnico alta resistência · 220–240V · 2.5 W/dm² · func. 10–20°C · anti-embaciante · IP54 · CE,FCC,RoHS

### Espelho LED Cantos Retos — `DMWH-ES202501` · dims PLACEHOLDER
img: /wp-content/uploads/2025/07/Espelho_Cantos-Retos-LED_cam-01_Produto-Ambiente-scaled-1440x1800.jpg
### Espelho LED Cantos Arredondados — `DMWH-ES202502` · dims PLACEHOLDER
### Espelho LED Cantos Retos s/ moldura — `DMWH-ES202509` · dims PLACEHOLDER
### Espelho Redondo LED s/ aro — variants `DMWH-ES202503A/B/C/D` · 600×800mm (personalizável)
img: /wp-content/uploads/2025/07/Espelho_Redondo-LED-sem-Aro_cam-01_Produto-Ambiente-scaled-1440x1800.jpg
### Espelho Redondo LED c/ aro preto — `DMWH-ES202504` · dims PLACEHOLDER
### Espelho Redondo LED s/ aro (simples) — `DMWH-ES202505` · dims PLACEHOLDER
### Espelho Arqueado LED s/ aro — `DMWH-ES202506` · dims PLACEHOLDER
### Espelho Arqueado Alto LED c/ aro preto — `DMWH-ES202507` · dims PLACEHOLDER
### Espelho Oval LED c/ aro dourado — `DMWH-ES202508` · dims PLACEHOLDER

---

## Gaps (mark PLACEHOLDER)
- All prices (site has none).
- SKUs: Carpintaria (3), Drenagem (3), Serralharia (1) — none published.
- Dimensions: most mirrors, fire doors, multiusos/ventilação doors — not published.
- BIM/CAD files (IFC/RFA/etc.), IES/LDT, DoP, EPD, DPP, lead times, MOQ, volume tiers — none published.
