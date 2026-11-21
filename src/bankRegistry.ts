// Registered bank identities; their common alert grammar is based on observed SMS structures.
export const bankProfiles:Record<string,string[]>={
  "Cooperative Bank of Oromia": [
    "COOP",
    "COOPBANK",
    "COOPERATIVEBANK"
  ],
  "Hibret Bank": [
    "HIBRET",
    "HIBRETBANK",
    "UNITEDBANK"
  ],
  "Nib International Bank": [
    "NIB",
    "NIBBANK"
  ],
  "Wegagen Bank": [
    "WEGAGEN",
    "WEGAGENBANK"
  ],
  "Amhara Bank": [
    "AMHARA",
    "AMHARABANK"
  ],
  "Siinqee Bank": [
    "SIINQEE",
    "SIINQEEBANK",
    "SINQEE",
    "SINQEEBANK"
  ],
  "Oromia Bank": [
    "OROMIA",
    "OROMIABANK"
  ],
  "Berhan Bank": [
    "BERHAN",
    "BERHANBANK"
  ],
  "Enat Bank": [
    "ENAT",
    "ENATBANK"
  ],
  "Bunna Bank": [
    "BUNNA",
    "BUNNABANK"
  ],
  "Lion Bank": [
    "LION",
    "LIONBANK",
    "LIB",
    "ANBESSA"
  ],
  "Tseday Bank": [
    "TSEDAY",
    "TSEDAYBANK"
  ],
  "Global Bank Ethiopia": [
    "GLOBAL",
    "GLOBALBANK"
  ],
  "Gadaa Bank": [
    "GADAA",
    "GADAABANK"
  ],
  "Hijra Bank": [
    "HIJRA",
    "HIJRABANK"
  ],
  "ZamZam Bank": [
    "ZAMZAM",
    "ZAMZAMBANK"
  ],
  "Ramis Bank": [
    "RAMIS",
    "RAMISBANK"
  ],
  "Ahadu Bank": [
    "AHADU",
    "AHADUBANK"
  ],
  "Sidama Bank": [
    "SIDAMA",
    "SIDAMABANK"
  ]
};
export const normalizeBankSender=(value:string)=>value.replace(/^\+/,'').replace(/[\s_.-]/g,'').toUpperCase();
export const bankSenderRegistry:Record<string,string>={};
for(const [name,aliases] of Object.entries(bankProfiles))for(const alias of [...aliases,name])bankSenderRegistry[normalizeBankSender(alias)]=name;
export const registeredBank=(sender:string)=>bankSenderRegistry[normalizeBankSender(sender)];
