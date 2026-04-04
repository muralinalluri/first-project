/**
 * JPMorgan Product Library
 * Registry of publicly available JPMorgan Asset Management products
 * with fact sheet / fund story HTML generation.
 */

export const PRODUCTS = [
  {
    key: 'JEPI',
    name: 'JPMorgan Equity Premium Income ETF',
    ticker: 'JEPI',
    category: 'ETF',
    assetClass: 'U.S. Equity (Income)',
    factSheetUrl: 'https://am.jpmorgan.com/us/en/asset-management/adv/products/jpmorgan-equity-premium-income-etf-etf-shares-46641q332',
    inceptionDate: 'May 20, 2020',
    benchmark: 'S&P 500 Index',
    expenseRatio: '0.35%',
    distributionFrequency: 'Monthly',
    riskLevel: 'Moderate',
    focus: 'income, covered calls, low volatility, yield, conservative growth, dividends, retirement income, monthly distributions',
    description: 'Seeks to deliver monthly income and less volatile equity market returns by investing in large-cap U.S. stocks combined with an equity-linked note (ELN) overlay that writes out-of-the-money call options on the S&P 500.',
    fundStory: 'JEPI was designed for investors who want meaningful equity market participation but are concerned about volatility and need a reliable income stream. By pairing a diversified large-cap equity portfolio with an ELN overlay — essentially selling option premium on the S&P 500 — JEPI harvests income from volatility while dampening drawdowns. The result is a smoother ride than owning the index outright, with competitive monthly distributions that appeal to retirees and income-focused allocators alike.',
    keyFeatures: [
      'Monthly income distributions with equity market participation',
      'Lower portfolio volatility vs. S&P 500 via ELN overlay',
      'Actively managed by JPMorgan\'s experienced investment team',
      'Diversified across large-cap S&P 500 companies',
    ],
    suitability: 'Income-seeking investors who want monthly distributions, equity upside, and reduced drawdown risk compared to a traditional S&P 500 index fund.',
  },
  {
    key: 'JEPQ',
    name: 'JPMorgan Nasdaq Equity Premium Income ETF',
    ticker: 'JEPQ',
    category: 'ETF',
    assetClass: 'U.S. Equity (Technology + Income)',
    factSheetUrl: 'https://am.jpmorgan.com/us/en/asset-management/adv/products/jpmorgan-nasdaq-equity-premium-income-etf-etf-shares-46654q203',
    inceptionDate: 'May 3, 2022',
    benchmark: 'NASDAQ-100 Index',
    expenseRatio: '0.35%',
    distributionFrequency: 'Monthly',
    riskLevel: 'Moderate-High',
    focus: 'technology, tech, nasdaq, income, covered calls, growth plus yield, monthly income, innovation',
    description: 'Seeks to generate monthly income while providing exposure to the NASDAQ-100 through an actively managed portfolio of technology-oriented stocks combined with an equity-linked note (ELN) overlay.',
    fundStory: 'JEPQ brings the proven JEPI framework to the technology-driven NASDAQ-100 universe. For investors who believe in the long-run secular growth of technology but want to monetize today\'s elevated implied volatility in that space, JEPQ offers a compelling solution. It captures the Nasdaq\'s long-term appreciation potential while writing option premium to generate above-average monthly income — effectively getting paid to own tech.',
    keyFeatures: [
      'Monthly income with meaningful technology sector exposure',
      'ELN overlay monetizes Nasdaq implied volatility premium',
      'Active stock selection within the NASDAQ-100 universe',
      'Balances long-term growth potential with current income generation',
    ],
    suitability: 'Investors who want technology and innovation sector exposure paired with a monthly income-generating overlay to smooth returns.',
  },
  {
    key: 'JPST',
    name: 'JPMorgan Ultra-Short Income ETF',
    ticker: 'JPST',
    category: 'ETF',
    assetClass: 'Fixed Income (Ultra-Short)',
    factSheetUrl: 'https://am.jpmorgan.com/us/en/asset-management/adv/products/jpmorgan-ultra-short-income-etf-etf-shares-46641q837',
    inceptionDate: 'May 17, 2017',
    benchmark: 'ICE BofA 0-1 Year US Treasury/Agency Index',
    expenseRatio: '0.18%',
    distributionFrequency: 'Monthly',
    riskLevel: 'Low',
    focus: 'capital preservation, cash alternative, low duration, interest rate, liquidity, safety, conservative, parking cash, short-term',
    description: 'An actively managed ultra-short-term fixed income ETF providing current income while maintaining very low duration and high credit quality — an attractive alternative to cash, money market funds, and CDs.',
    fundStory: 'In a world where idle cash earns little, JPST offers a liquid, low-risk alternative that consistently outperforms money market yields without meaningfully extending duration or credit risk. JPMorgan\'s active management adds value through careful sector rotation and credit selection within the ultra-short universe. For clients with near-term liquidity needs or conservative risk profiles, JPST represents a natural first stop for cash optimization.',
    keyFeatures: [
      'Capital preservation with monthly income generation',
      'Ultra-low duration limits interest rate sensitivity',
      'Investment-grade portfolio with active credit management',
      'Daily liquidity — trades like a stock on exchange',
    ],
    suitability: 'Conservative investors and those seeking to enhance yield on cash-like holdings while maintaining capital preservation and daily liquidity.',
  },
  {
    key: 'JGRO',
    name: 'JPMorgan Active Growth ETF',
    ticker: 'JGRO',
    category: 'ETF',
    assetClass: 'U.S. Equity (Growth)',
    factSheetUrl: 'https://am.jpmorgan.com/us/en/asset-management/adv/products/jpmorgan-active-growth-etf-etf-shares-46654q609',
    inceptionDate: 'September 22, 2020',
    benchmark: 'Russell 1000 Growth Index',
    expenseRatio: '0.44%',
    distributionFrequency: 'Quarterly',
    riskLevel: 'High',
    focus: 'growth, long-term, capital appreciation, active management, high growth, growth stocks, equity appreciation, wealth accumulation',
    description: 'Actively managed ETF seeking long-term capital appreciation by investing in large-cap U.S. growth companies with durable competitive advantages and strong earnings momentum.',
    fundStory: 'JGRO puts JPMorgan\'s deep fundamental research capability to work in a tax-efficient, low-cost ETF wrapper. The portfolio managers seek to identify companies where strong earnings growth is underappreciated by the market — those with sustainable competitive moats, pricing power, and the ability to reinvest at high returns on capital. The active approach means the fund isn\'t constrained to replicate an index, allowing the team to overweight their highest-conviction ideas.',
    keyFeatures: [
      'Active growth stock selection by JPMorgan\'s experienced portfolio managers',
      'Focus on quality growth companies with durable competitive moats',
      'Long-term capital appreciation as the primary objective',
      'ETF structure: tax efficiency, intraday liquidity, no minimum investment',
    ],
    suitability: 'Growth-oriented investors with long time horizons seeking capital appreciation through actively managed U.S. large-cap growth equities.',
  },
  {
    key: 'JPRE',
    name: 'JPMorgan Realty Income ETF',
    ticker: 'JPRE',
    category: 'ETF',
    assetClass: 'Real Estate (REITs)',
    factSheetUrl: 'https://am.jpmorgan.com/us/en/asset-management/adv/products/jpmorgan-realty-income-etf-etf-shares-46641q126',
    inceptionDate: 'September 22, 2020',
    benchmark: 'FTSE NAREIT All Equity REITs Index',
    expenseRatio: '0.50%',
    distributionFrequency: 'Monthly',
    riskLevel: 'Moderate',
    focus: 'real estate, REITs, income, inflation hedge, alternative assets, property, real assets, tangible assets',
    description: 'Actively managed ETF seeking income and moderate capital appreciation through investments in real estate investment trusts (REITs) and real estate operating companies.',
    fundStory: 'Real estate has historically served as both an income engine and an inflation hedge — two characteristics in high demand by today\'s investors. JPRE\'s active management allows the portfolio to tilt toward the highest-quality property sectors (industrial, healthcare, residential) while avoiding overvalued pockets of the REIT market. Monthly distributions make it suitable as a portfolio income complement alongside traditional fixed income.',
    keyFeatures: [
      'Monthly income distributions from diversified REIT holdings',
      'Real estate as an inflation hedge and portfolio diversifier',
      'Active selection focuses on highest-quality properties and balance sheets',
      'Access across all REIT sectors: industrial, residential, healthcare, retail',
    ],
    suitability: 'Income-seeking investors looking for real estate exposure, inflation protection, and diversification beyond traditional stocks and bonds.',
  },
  {
    key: 'JIRE',
    name: 'JPMorgan International Research Enhanced Equity ETF',
    ticker: 'JIRE',
    category: 'ETF',
    assetClass: 'International Equity (Developed Markets)',
    factSheetUrl: 'https://am.jpmorgan.com/us/en/asset-management/adv/products/jpmorgan-international-research-enhanced-equity-etf-etf-shares-46641q134',
    inceptionDate: 'November 8, 2016',
    benchmark: 'MSCI EAFE Index',
    expenseRatio: '0.25%',
    distributionFrequency: 'Quarterly',
    riskLevel: 'Moderate-High',
    focus: 'international, global, diversification, developed markets, active research, Europe, Asia, Pacific, non-US exposure',
    description: 'Seeks long-term capital growth by investing in developed international equities using an enhanced research-driven approach that tilts toward higher-quality names within the MSCI EAFE benchmark.',
    fundStory: 'With U.S. equities commanding historically elevated valuations, international diversification has become increasingly important for disciplined investors. JIRE leverages JPMorgan\'s deep global equity research capabilities to identify the most attractive opportunities within the MSCI EAFE universe, applying modest tilts toward quality and value factors. The result is an active approach at near-passive cost — providing clients with genuine global exposure they may currently be lacking.',
    keyFeatures: [
      'Research-driven stock selection within the MSCI EAFE universe',
      'International diversification beyond potentially overvalued U.S. markets',
      'Active management at an index-comparable expense ratio (0.25%)',
      'Exposure to developed markets across Europe, Asia, and the Pacific',
    ],
    suitability: 'Investors seeking cost-efficient international equity diversification with active research overlay to complement a U.S.-heavy portfolio.',
  },
  {
    key: 'INCOME_FUND',
    name: 'JPMorgan Income Fund',
    ticker: null,
    category: 'Mutual Fund',
    assetClass: 'Multi-Asset Income',
    factSheetUrl: 'https://am.jpmorgan.com/us/en/asset-management/adv/products/jpmorgan-income-fund-a-46637k240',
    inceptionDate: 'November 1, 1987',
    benchmark: 'Bloomberg U.S. Aggregate Bond Index',
    expenseRatio: '0.75% (Class A)',
    distributionFrequency: 'Monthly',
    riskLevel: 'Moderate',
    focus: 'multi-asset income, moderate risk, regular distributions, balanced income, steady income, bonds, fixed income, multi-sector',
    description: 'Seeks to maximize current income by investing across a diversified range of income-producing securities — including investment-grade bonds, high-yield bonds, mortgage-backed securities, and dividend-paying equities.',
    fundStory: 'One of JPMorgan\'s flagship income strategies, the Income Fund has navigated more than three decades of market cycles by flexibly allocating across the full opportunity set of income-generating assets. The portfolio management team dynamically adjusts sector exposures — rotating between investment-grade credit, high yield, emerging market debt, and dividend equities — to optimize the income-to-risk ratio at any given point in the market cycle.',
    keyFeatures: [
      'Diversified income across bonds, credit, mortgages, and dividend equities',
      'Monthly income distributions for steady cash flow',
      'Flexible mandate allows pursuit of highest-yielding opportunities globally',
      'Active risk management with dynamic duration and credit exposure',
    ],
    suitability: 'Income-focused investors seeking regular monthly distributions from a diversified, multi-asset framework with active downside management.',
  },
  {
    key: 'SMARTRETIREMENT',
    name: 'JPMorgan SmartRetirement Funds',
    ticker: null,
    category: 'Target-Date Fund',
    assetClass: 'Target-Date / Multi-Asset',
    factSheetUrl: 'https://am.jpmorgan.com/us/en/asset-management/adv/investment-strategies/multi-asset/smartretirement/',
    inceptionDate: 'Various (2005 onwards)',
    benchmark: 'JPMorgan SmartRetirement Blend Index',
    expenseRatio: '0.44% (Blend)',
    distributionFrequency: 'Quarterly',
    riskLevel: 'Varies by Target Date',
    focus: 'retirement planning, target date, lifecycle, retirement income, 401k, pension, long-term savings',
    description: 'A series of target-date funds that automatically adjust the asset allocation glide path as investors approach and enter retirement, progressively shifting from growth-oriented equities toward income-producing fixed income.',
    fundStory: 'SmartRetirement was built on a simple insight: the biggest risk retirees face is running out of money, not market volatility. The funds\' proprietary glide path goes "through" retirement — not "to" it — continuing to actively manage the portfolio well into the distribution phase. By incorporating alternatives, real assets, and multi-sector fixed income alongside traditional equities, SmartRetirement provides a more sophisticated solution than conventional target-date products.',
    keyFeatures: [
      'Automatic glide path: adjusts from growth to income as retirement approaches',
      'Continues to adapt through retirement, not just up to it',
      'Broadly diversified across global equities, bonds, and real assets',
      'Single-ticket simplicity with institutional-quality active management',
    ],
    suitability: 'Long-term retirement savers who want a professionally managed, all-in-one solution that evolves automatically with their investment time horizon.',
  },
];

/**
 * Look up a product by ticker or key.
 */
export function getProduct(tickerOrKey) {
  return PRODUCTS.find(p => p.ticker === tickerOrKey || p.key === tickerOrKey) || null;
}

/**
 * Return a simplified product list suitable for prompts.
 */
export function getProductsForPrompt() {
  return PRODUCTS.map(p => ({
    key: p.key,
    name: p.name,
    ticker: p.ticker || '—',
    category: p.category,
    assetClass: p.assetClass,
    riskLevel: p.riskLevel,
    focus: p.focus,
  }));
}

/**
 * Generate a professional HTML fact sheet + fund story page for a product.
 * Suitable for browser printing to PDF.
 */
export function generateFactSheetHtml(tickerOrKey) {
  const p = getProduct(tickerOrKey);
  if (!p) return null;

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const riskColor = {
    'Low': '#0D7A4E',
    'Moderate': '#005EB8',
    'Moderate-High': '#B5923A',
    'High': '#C41E3A',
  }[p.riskLevel] || '#003087';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${p.name} — Fact Sheet</title>
<style>
  @page { size: letter; margin: 1.2cm 2cm 1.5cm; }
  *,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #1A2B4A; line-height: 1.5; background: #fff; }
  /* ── Header ── */
  .hdr { background: #003087; color: #fff; padding: 16px 22px 14px; display: flex; align-items: flex-start; justify-content: space-between; }
  .hdr-brand { font-size: 13pt; font-weight: 700; letter-spacing: -.01em; margin-bottom: 2px; }
  .hdr-brand-sub { font-size: 7.5pt; color: rgba(255,255,255,.55); margin-bottom: 10px; }
  .hdr-name { font-size: 14.5pt; font-weight: 700; line-height: 1.2; margin-bottom: 5px; max-width: 460px; }
  .hdr-badges { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  .badge-ticker { background: #B5923A; color: #fff; font-size: 8.5pt; font-weight: 700; padding: 2px 9px; border-radius: 3px; }
  .badge-cat { background: rgba(255,255,255,.15); color: rgba(255,255,255,.85); font-size: 7.5pt; font-weight: 600; padding: 2px 8px; border-radius: 3px; }
  .hdr-right { text-align: right; font-size: 8pt; color: rgba(255,255,255,.6); min-width: 110px; }
  .hdr-right .doc-type { font-size: 10pt; font-weight: 700; color: #fff; margin-bottom: 3px; }
  .gold-bar { height: 3px; background: #B5923A; }
  /* ── Body ── */
  .body { padding: 16px 22px 10px; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 14px; }
  .section { margin-bottom: 14px; }
  .section-ttl { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: .09em; color: #B5923A; border-bottom: 1px solid #C9D8EC; padding-bottom: 4px; margin-bottom: 9px; }
  .desc { font-size: 9.5pt; color: #3A5278; line-height: 1.65; }
  /* ── Stats ── */
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .stat { background: #EAF0F8; border: 1px solid #C9D8EC; border-radius: 5px; padding: 8px 10px; }
  .stat-lbl { font-size: 7pt; color: #5A7399; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 2px; }
  .stat-val { font-size: 10.5pt; font-weight: 700; color: #003087; line-height: 1.2; }
  .stat-val.sm { font-size: 9pt; }
  /* ── Features ── */
  .feat-list { list-style: none; display: flex; flex-direction: column; gap: 5px; }
  .feat-list li { font-size: 9pt; color: #3A5278; padding-left: 13px; position: relative; line-height: 1.55; }
  .feat-list li::before { content: '▸'; position: absolute; left: 0; color: #B5923A; font-size: 8pt; top: 1px; }
  /* ── Suitability ── */
  .suitability { background: #F9F4EB; border-left: 3px solid #B5923A; border-radius: 0 5px 5px 0; padding: 9px 13px; }
  .suitability .lbl { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #B5923A; margin-bottom: 4px; }
  .suitability p { font-size: 9pt; color: #3A5278; line-height: 1.6; }
  /* ── Fund Story ── */
  .fund-story { background: #F4F6F9; border: 1px solid #C9D8EC; border-radius: 6px; padding: 12px 14px; }
  .fund-story p { font-size: 9.5pt; color: #3A5278; line-height: 1.7; font-style: italic; }
  /* ── Risk ── */
  .risk-tag { display: inline-flex; align-items: center; gap: 5px; border: 1.5px solid; border-radius: 20px; padding: 3px 10px; font-size: 8.5pt; font-weight: 700; }
  /* ── Divider ── */
  .page-break-hint { border: none; border-top: 2px solid #003087; margin: 14px 0 12px; opacity: .15; }
  /* ── Footer ── */
  .footer { padding: 0 22px 12px; border-top: 1px solid #C9D8EC; padding-top: 10px; font-size: 7pt; color: #5A7399; line-height: 1.5; }
  /* Print */
  @media print {
    .hdr, .gold-bar, .stat, .suitability, .fund-story {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body { background: #fff; }
  }
</style>
</head>
<body>

<div class="hdr">
  <div>
    <div class="hdr-brand">J.P. Morgan</div>
    <div class="hdr-brand-sub">Asset Management</div>
    <div class="hdr-name">${p.name}</div>
    <div class="hdr-badges">
      ${p.ticker ? `<span class="badge-ticker">${p.ticker}</span>` : ''}
      <span class="badge-cat">${p.assetClass}</span>
      <span class="badge-cat">${p.category}</span>
    </div>
  </div>
  <div class="hdr-right">
    <div class="doc-type">Fact Sheet</div>
    <div>${today}</div>
    <div style="margin-top:6px;font-size:7.5pt;">For Advisor Use Only<br>Not for Client Distribution</div>
  </div>
</div>
<div class="gold-bar"></div>

<div class="body">

  <div class="two-col">
    <div>
      <!-- Product Overview -->
      <div class="section">
        <div class="section-ttl">Product Overview</div>
        <p class="desc">${p.description}</p>
      </div>
      <!-- Key Statistics -->
      <div class="section">
        <div class="section-ttl">Key Statistics</div>
        <div class="stats-grid">
          <div class="stat"><div class="stat-lbl">Inception</div><div class="stat-val sm">${p.inceptionDate}</div></div>
          <div class="stat"><div class="stat-lbl">Expense Ratio</div><div class="stat-val">${p.expenseRatio}</div></div>
          <div class="stat"><div class="stat-lbl">Distributions</div><div class="stat-val sm">${p.distributionFrequency}</div></div>
          <div class="stat" style="grid-column:1/3"><div class="stat-lbl">Benchmark</div><div class="stat-val sm">${p.benchmark}</div></div>
          <div class="stat"><div class="stat-lbl">Risk Level</div><div class="stat-val sm" style="color:${riskColor}">${p.riskLevel}</div></div>
        </div>
      </div>
    </div>

    <div>
      <!-- Key Features -->
      <div class="section">
        <div class="section-ttl">Key Features</div>
        <ul class="feat-list">
          ${p.keyFeatures.map(f => `<li>${f}</li>`).join('\n          ')}
        </ul>
      </div>
      <!-- Suitability -->
      <div class="section">
        <div class="section-ttl">Target Investor</div>
        <div class="suitability">
          <div class="lbl">Suitability</div>
          <p>${p.suitability}</p>
        </div>
      </div>
    </div>
  </div>

  <hr class="page-break-hint">

  <!-- Fund Story -->
  <div class="section">
    <div class="section-ttl">Fund Story — The Investment Case</div>
    <div class="fund-story">
      <p>${p.fundStory}</p>
    </div>
  </div>

</div>

<div class="footer">
  <strong>Important Disclosures:</strong> This document is intended for financial professional use only and is not for redistribution to retail clients.
  Investing involves risk, including possible loss of principal. Past performance is not a guarantee of future results.
  The information herein is subject to change without notice.
  J.P. Morgan Asset Management is the brand for the asset management business of JPMorgan Chase &amp; Co. and its affiliates worldwide.
  <br>&copy; ${new Date().getFullYear()} JPMorgan Chase &amp; Co. All rights reserved.
</div>

</body>
</html>`;
}
