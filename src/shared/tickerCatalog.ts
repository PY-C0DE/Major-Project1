/**
 * Shared Ticker Catalog & Metadata
 * Shared between client and server without pulling server code into frontend bundles.
 */

export interface TickerMeta {
  ticker: string;
  name: string;
  exchange: string;
  currency: string;
  basePrice: number;
  pe: number;
  marketCap: number;
  sector: string;
  aliases: string[];
}

// Comprehensive catalog of major Indian (NSE) and US / Global companies
export const TICKER_CATALOG: TickerMeta[] = [
  // --- Indian Equities (NSE) ---
  {
    ticker: 'RELIANCE.NS',
    name: 'Reliance Industries Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 2980.50,
    pe: 28.4,
    marketCap: 20150000000000,
    sector: 'Energy & Conglomerate',
    aliases: ['reliance', 'ril', 'jio', 'reliance industries', 'mukesh ambani']
  },
  {
    ticker: 'TCS.NS',
    name: 'Tata Consultancy Services',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 4210.75,
    pe: 32.1,
    marketCap: 15200000000000,
    sector: 'Information Technology',
    aliases: ['tcs', 'tata consultancy', 'tata consultancy services', 'tata tech']
  },
  {
    ticker: 'INFY.NS',
    name: 'Infosys Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 1915.20,
    pe: 27.6,
    marketCap: 7950000000000,
    sector: 'Information Technology',
    aliases: ['infosys', 'infy', 'infosys tech']
  },
  {
    ticker: 'HDFCBANK.NS',
    name: 'HDFC Bank Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 1675.40,
    pe: 19.8,
    marketCap: 12700000000000,
    sector: 'Banking & Financial Services',
    aliases: ['hdfc', 'hdfc bank', 'housing development finance']
  },
  {
    ticker: 'ICICIBANK.NS',
    name: 'ICICI Bank Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 1245.90,
    pe: 18.5,
    marketCap: 8750000000000,
    sector: 'Banking & Financial Services',
    aliases: ['icici', 'icici bank']
  },
  {
    ticker: 'SBIN.NS',
    name: 'State Bank of India',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 815.60,
    pe: 11.4,
    marketCap: 7280000000000,
    sector: 'Banking & Financial Services',
    aliases: ['sbi', 'sbin', 'state bank', 'state bank of india']
  },
  {
    ticker: 'TMCV.NS',
    name: 'Tata Motors Ltd. (Commercial Vehicles)',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 414.25,
    pe: 14.5,
    marketCap: 1520000000000,
    sector: 'Automobile',
    aliases: ['tata motors', 'tatamotors', 'tmcv', 'tamo', 'tata commercial vehicles', 'tata trucks']
  },
  {
    ticker: 'TMPV.NS',
    name: 'Tata Motors Passenger Vehicles Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 270.00,
    pe: 18.2,
    marketCap: 1050000000000,
    sector: 'Automobile & EV',
    aliases: ['tata passenger vehicles', 'tmpv', 'tata ev', 'jaguar land rover', 'jlr', 'tata motors pv']
  },
  {
    ticker: 'BHARTIARTL.NS',
    name: 'Bharti Airtel Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 1680.10,
    pe: 48.2,
    marketCap: 9800000000000,
    sector: 'Telecommunications',
    aliases: ['airtel', 'bharti airtel', 'bharti']
  },
  {
    ticker: 'ITC.NS',
    name: 'ITC Limited',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 505.40,
    pe: 28.3,
    marketCap: 6300000000000,
    sector: 'FMCG',
    aliases: ['itc', 'itc limited', 'indian tobacco company']
  },
  {
    ticker: 'LT.NS',
    name: 'Larsen & Toubro Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 3560.00,
    pe: 34.5,
    marketCap: 4890000000000,
    sector: 'Engineering & Infrastructure',
    aliases: ['l&t', 'lt', 'larsen', 'larsen and toubro', 'larsen & toubro']
  },
  {
    ticker: 'HINDUNILVR.NS',
    name: 'Hindustan Unilever Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 2790.80,
    pe: 58.1,
    marketCap: 6550000000000,
    sector: 'FMCG',
    aliases: ['hul', 'hindustan unilever', 'unilever india', 'unilever']
  },
  {
    ticker: 'BAJFINANCE.NS',
    name: 'Bajaj Finance Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 7280.00,
    pe: 31.2,
    marketCap: 4500000000000,
    sector: 'Financial Services',
    aliases: ['bajaj finance', 'bajfinance', 'bajaj finserv', 'bajaj']
  },
  {
    ticker: 'ASIANPAINT.NS',
    name: 'Asian Paints Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 3120.50,
    pe: 52.4,
    marketCap: 2990000000000,
    sector: 'Consumer Goods & Paints',
    aliases: ['asian paints', 'asianpaint', 'paints']
  },
  {
    ticker: 'KOTAKBANK.NS',
    name: 'Kotak Mahindra Bank',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 1820.40,
    pe: 21.3,
    marketCap: 3620000000000,
    sector: 'Banking & Financial Services',
    aliases: ['kotak', 'kotak bank', 'kotak mahindra']
  },
  {
    ticker: 'AXISBANK.NS',
    name: 'Axis Bank Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 1180.20,
    pe: 14.8,
    marketCap: 3640000000000,
    sector: 'Banking & Financial Services',
    aliases: ['axis', 'axis bank', 'uti bank']
  },
  {
    ticker: 'SUNPHARMA.NS',
    name: 'Sun Pharmaceutical Industries',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 1890.60,
    pe: 38.6,
    marketCap: 4530000000000,
    sector: 'Pharmaceuticals',
    aliases: ['sun pharma', 'sun pharmaceutical', 'sun']
  },
  {
    ticker: 'MARUTI.NS',
    name: 'Maruti Suzuki India Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 12450.00,
    pe: 29.4,
    marketCap: 3910000000000,
    sector: 'Automobile',
    aliases: ['maruti', 'maruti suzuki', 'suzuki india']
  },
  {
    ticker: 'TITAN.NS',
    name: 'Titan Company Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 3480.00,
    pe: 82.1,
    marketCap: 3090000000000,
    sector: 'Consumer & Jewelry',
    aliases: ['titan', 'tanishq', 'fastrack', 'titan company']
  },
  {
    ticker: 'ADANIENT.NS',
    name: 'Adani Enterprises Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 3120.00,
    pe: 95.2,
    marketCap: 3550000000000,
    sector: 'Conglomerate & Energy',
    aliases: ['adani', 'adani enterprises', 'gautam adani']
  },
  {
    ticker: 'ADANIPORTS.NS',
    name: 'Adani Ports & SEZ Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 1420.50,
    pe: 32.7,
    marketCap: 3060000000000,
    sector: 'Infrastructure & Ports',
    aliases: ['adani ports', 'apsez', 'mundra port']
  },
  {
    ticker: 'WIPRO.NS',
    name: 'Wipro Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 535.20,
    pe: 22.8,
    marketCap: 2800000000000,
    sector: 'Information Technology',
    aliases: ['wipro', 'wipro tech', 'azim premji']
  },
  {
    ticker: 'HCLTECH.NS',
    name: 'HCL Technologies Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 1810.00,
    pe: 28.5,
    marketCap: 4910000000000,
    sector: 'Information Technology',
    aliases: ['hcl', 'hcl tech', 'hcl technologies']
  },
  {
    ticker: 'ULTRACEMCO.NS',
    name: 'UltraTech Cement Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 11450.00,
    pe: 44.2,
    marketCap: 3310000000000,
    sector: 'Materials & Cement',
    aliases: ['ultratech', 'ultratech cement', 'aditya birla cement']
  },
  {
    ticker: 'POWERGRID.NS',
    name: 'Power Grid Corp. of India',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 335.80,
    pe: 18.2,
    marketCap: 3120000000000,
    sector: 'Utilities & Power',
    aliases: ['power grid', 'powergrid', 'pgcil']
  },
  {
    ticker: 'NTPC.NS',
    name: 'NTPC Limited',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 412.50,
    pe: 17.4,
    marketCap: 4000000000000,
    sector: 'Utilities & Power',
    aliases: ['ntpc', 'national thermal power corporation']
  },
  {
    ticker: 'ONGC.NS',
    name: 'Oil & Natural Gas Corporation',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 288.40,
    pe: 7.8,
    marketCap: 3620000000000,
    sector: 'Energy & Oil',
    aliases: ['ongc', 'oil and natural gas']
  },
  {
    ticker: 'COALINDIA.NS',
    name: 'Coal India Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 485.60,
    pe: 8.5,
    marketCap: 2990000000000,
    sector: 'Energy & Mining',
    aliases: ['coal india', 'cil', 'coal']
  },
  {
    ticker: 'TATAPOWER.NS',
    name: 'Tata Power Company Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 435.20,
    pe: 35.8,
    marketCap: 1390000000000,
    sector: 'Utilities & Clean Energy',
    aliases: ['tata power', 'tata solar', 'tata renewable']
  },
  {
    ticker: 'TATASTEEL.NS',
    name: 'Tata Steel Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 158.40,
    pe: 24.1,
    marketCap: 1980000000000,
    sector: 'Materials & Steel',
    aliases: ['tata steel', 'tisco']
  },
  {
    ticker: 'ETERNAL.NS',
    name: 'Eternal Ltd. (formerly Zomato)',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 304.45,
    pe: 145.2,
    marketCap: 2720000000000,
    sector: 'Consumer Internet & Food Tech',
    aliases: ['zomato', 'eternal', 'blinkit', 'hyperpure', 'deepinder goyal']
  },
  {
    ticker: 'JIOFIN.NS',
    name: 'Jio Financial Services Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 345.80,
    pe: 85.2,
    marketCap: 2190000000000,
    sector: 'Financial Services',
    aliases: ['jio financial', 'jio finance', 'jiofin', 'jfs']
  },
  {
    ticker: 'M&M.NS',
    name: 'Mahindra & Mahindra Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 3080.00,
    pe: 31.6,
    marketCap: 3830000000000,
    sector: 'Automobile',
    aliases: ['m&m', 'mahindra', 'mahindra and mahindra', 'thar', 'scorpio']
  },
  {
    ticker: 'BAJAJ-AUTO.NS',
    name: 'Bajaj Auto Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 11950.00,
    pe: 36.4,
    marketCap: 3380000000000,
    sector: 'Automobile',
    aliases: ['bajaj auto', 'bajaj bike', 'pulsar', 'chetak']
  },
  {
    ticker: 'NESTLEIND.NS',
    name: 'Nestle India Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 2480.00,
    pe: 72.8,
    marketCap: 2390000000000,
    sector: 'FMCG',
    aliases: ['nestle', 'nestle india', 'maggi', 'nescafe']
  },
  {
    ticker: 'CIPLA.NS',
    name: 'Cipla Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 1590.00,
    pe: 28.5,
    marketCap: 1280000000000,
    sector: 'Pharmaceuticals',
    aliases: ['cipla', 'cipla pharma']
  },
  {
    ticker: 'DRREDDY.NS',
    name: 'Dr. Reddy Laboratories',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 6650.00,
    pe: 22.1,
    marketCap: 1110000000000,
    sector: 'Pharmaceuticals',
    aliases: ['dr reddy', 'dr reddys', 'dr reddy laboratories']
  },
  {
    ticker: 'TRENT.NS',
    name: 'Trent Limited',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 7850.00,
    pe: 145.0,
    marketCap: 2790000000000,
    sector: 'Retail & Fashion',
    aliases: ['trent', 'zudio', 'westside', 'tata retail']
  },
  {
    ticker: 'BEL.NS',
    name: 'Bharat Electronics Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 295.40,
    pe: 46.2,
    marketCap: 2160000000000,
    sector: 'Defense & Aerospace',
    aliases: ['bel', 'bharat electronics', 'defense electronics']
  },
  {
    ticker: 'HAL.NS',
    name: 'Hindustan Aeronautics Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    basePrice: 4420.00,
    pe: 38.9,
    marketCap: 2950000000000,
    sector: 'Defense & Aerospace',
    aliases: ['hal', 'hindustan aeronautics', 'tejas']
  },

  // --- US & Global Equities ---
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    currency: 'USD',
    basePrice: 128.40,
    pe: 54.2,
    marketCap: 3150000000000,
    sector: 'Semiconductors & AI',
    aliases: ['nvidia', 'nvda', 'geforce', 'jensen huang', 'blackwell']
  },
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    exchange: 'NASDAQ',
    currency: 'USD',
    basePrice: 228.50,
    pe: 33.5,
    marketCap: 3480000000000,
    sector: 'Consumer Electronics',
    aliases: ['apple', 'aapl', 'iphone', 'ipad', 'mac', 'macbook', 'tim cook']
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    exchange: 'NASDAQ',
    currency: 'USD',
    basePrice: 442.10,
    pe: 36.1,
    marketCap: 3280000000000,
    sector: 'Enterprise Software & Cloud',
    aliases: ['microsoft', 'msft', 'azure', 'windows', 'xbox', 'satya nadella', 'copilot']
  },
  {
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    exchange: 'NASDAQ',
    currency: 'USD',
    basePrice: 178.60,
    pe: 24.8,
    marketCap: 2210000000000,
    sector: 'Internet & Search',
    aliases: ['google', 'alphabet', 'googl', 'goog', 'youtube', 'android', 'gemini', 'sundar pichai']
  },
  {
    ticker: 'AMZN',
    name: 'Amazon.com Inc.',
    exchange: 'NASDAQ',
    currency: 'USD',
    basePrice: 186.75,
    pe: 42.9,
    marketCap: 1940000000000,
    sector: 'E-Commerce & Cloud Computing',
    aliases: ['amazon', 'amzn', 'aws', 'prime', 'jeff bezos', 'andy jassy']
  },
  {
    ticker: 'TSLA',
    name: 'Tesla Inc.',
    exchange: 'NASDAQ',
    currency: 'USD',
    basePrice: 248.90,
    pe: 68.4,
    marketCap: 792000000000,
    sector: 'Automotive & Clean Energy',
    aliases: ['tesla', 'tsla', 'elon musk', 'cybertruck', 'model 3', 'model y']
  },
  {
    ticker: 'META',
    name: 'Meta Platforms Inc.',
    exchange: 'NASDAQ',
    currency: 'USD',
    basePrice: 585.30,
    pe: 28.2,
    marketCap: 1480000000000,
    sector: 'Social Media & AI',
    aliases: ['meta', 'facebook', 'instagram', 'whatsapp', 'zuckerberg', 'mark zuckerberg']
  },
  {
    ticker: 'AVGO',
    name: 'Broadcom Inc.',
    exchange: 'NASDAQ',
    currency: 'USD',
    basePrice: 175.20,
    pe: 45.1,
    marketCap: 818000000000,
    sector: 'Semiconductors',
    aliases: ['broadcom', 'avgo', 'vmware']
  },
  {
    ticker: 'BRK-B',
    name: 'Berkshire Hathaway Inc.',
    exchange: 'NYSE',
    currency: 'USD',
    basePrice: 472.00,
    pe: 21.0,
    marketCap: 1010000000000,
    sector: 'Conglomerate & Insurance',
    aliases: ['berkshire', 'berkshire hathaway', 'warren buffett', 'brk', 'brkb']
  },
  {
    ticker: 'LLY',
    name: 'Eli Lilly and Company',
    exchange: 'NYSE',
    currency: 'USD',
    basePrice: 915.00,
    pe: 92.4,
    marketCap: 868000000000,
    sector: 'Pharmaceuticals & Biotech',
    aliases: ['eli lilly', 'lilly', 'mounjaro', 'zepbound']
  },
  {
    ticker: 'JPM',
    name: 'JPMorgan Chase & Co.',
    exchange: 'NYSE',
    currency: 'USD',
    basePrice: 222.40,
    pe: 12.3,
    marketCap: 635000000000,
    sector: 'Banking & Financial Services',
    aliases: ['jpmorgan', 'jp morgan', 'chase', 'jamie dimon']
  },
  {
    ticker: 'V',
    name: 'Visa Inc.',
    exchange: 'NYSE',
    currency: 'USD',
    basePrice: 282.10,
    pe: 30.5,
    marketCap: 574000000000,
    sector: 'Financial Services & Payments',
    aliases: ['visa', 'visa card', 'payments']
  },
  {
    ticker: 'WMT',
    name: 'Walmart Inc.',
    exchange: 'NYSE',
    currency: 'USD',
    basePrice: 80.50,
    pe: 31.8,
    marketCap: 647000000000,
    sector: 'Consumer Retail',
    aliases: ['walmart', 'wmt', 'sam walton']
  },
  {
    ticker: 'NFLX',
    name: 'Netflix Inc.',
    exchange: 'NASDAQ',
    currency: 'USD',
    basePrice: 712.00,
    pe: 43.5,
    marketCap: 305000000000,
    sector: 'Entertainment & Streaming',
    aliases: ['netflix', 'nflx', 'streaming']
  },
  {
    ticker: 'AMD',
    name: 'Advanced Micro Devices',
    exchange: 'NASDAQ',
    currency: 'USD',
    basePrice: 156.40,
    pe: 115.0,
    marketCap: 252000000000,
    sector: 'Semiconductors',
    aliases: ['amd', 'advanced micro devices', 'ryzen', 'radeon', 'lisa su']
  },
  {
    ticker: 'INTC',
    name: 'Intel Corporation',
    exchange: 'NASDAQ',
    currency: 'USD',
    basePrice: 22.80,
    pe: 34.0,
    marketCap: 97000000000,
    sector: 'Semiconductors',
    aliases: ['intel', 'intc', 'core ultra', 'pat gelsinger']
  },
  {
    ticker: 'PLTR',
    name: 'Palantir Technologies Inc.',
    exchange: 'NYSE',
    currency: 'USD',
    basePrice: 43.50,
    pe: 95.0,
    marketCap: 96000000000,
    sector: 'Enterprise AI & Defense',
    aliases: ['palantir', 'pltr', 'alex karp', 'foundry', 'gotham']
  },
  {
    ticker: 'DIS',
    name: 'The Walt Disney Company',
    exchange: 'NYSE',
    currency: 'USD',
    basePrice: 95.80,
    pe: 38.2,
    marketCap: 174000000000,
    sector: 'Entertainment',
    aliases: ['disney', 'walt disney', 'dis', 'disney+', 'marvel', 'pixar']
  },
  {
    ticker: 'CRM',
    name: 'Salesforce Inc.',
    exchange: 'NYSE',
    currency: 'USD',
    basePrice: 288.00,
    pe: 48.0,
    marketCap: 279000000000,
    sector: 'Enterprise SaaS',
    aliases: ['salesforce', 'crm', 'marc benioff', 'agentforce']
  },
  {
    ticker: 'COIN',
    name: 'Coinbase Global Inc.',
    exchange: 'NASDAQ',
    currency: 'USD',
    basePrice: 198.50,
    pe: 42.0,
    marketCap: 49000000000,
    sector: 'Crypto & Fintech',
    aliases: ['coinbase', 'coin', 'crypto', 'brian armstrong']
  },
  {
    ticker: 'UBER',
    name: 'Uber Technologies Inc.',
    exchange: 'NYSE',
    currency: 'USD',
    basePrice: 78.40,
    pe: 36.5,
    marketCap: 162000000000,
    sector: 'Mobility & Delivery',
    aliases: ['uber', 'uber eats']
  }
];
