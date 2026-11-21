package com.birrx.app;
final class BankSenderRegistry {
 static final java.util.Map<String,String> BANKS=new java.util.HashMap<>();
 static {
  BANKS.put("COOP","Cooperative Bank of Oromia");
  BANKS.put("COOPBANK","Cooperative Bank of Oromia");
  BANKS.put("COOPERATIVEBANK","Cooperative Bank of Oromia");
  BANKS.put("COOPERATIVEBANKOFOROMIA","Cooperative Bank of Oromia");
  BANKS.put("HIBRET","Hibret Bank");
  BANKS.put("HIBRETBANK","Hibret Bank");
  BANKS.put("UNITEDBANK","Hibret Bank");
  BANKS.put("NIB","Nib International Bank");
  BANKS.put("NIBBANK","Nib International Bank");
  BANKS.put("NIBINTERNATIONALBANK","Nib International Bank");
  BANKS.put("WEGAGEN","Wegagen Bank");
  BANKS.put("WEGAGENBANK","Wegagen Bank");
  BANKS.put("AMHARA","Amhara Bank");
  BANKS.put("AMHARABANK","Amhara Bank");
  BANKS.put("SIINQEE","Siinqee Bank");
  BANKS.put("SIINQEEBANK","Siinqee Bank");
  BANKS.put("SINQEE","Siinqee Bank");
  BANKS.put("SINQEEBANK","Siinqee Bank");
  BANKS.put("OROMIA","Oromia Bank");
  BANKS.put("OROMIABANK","Oromia Bank");
  BANKS.put("BERHAN","Berhan Bank");
  BANKS.put("BERHANBANK","Berhan Bank");
  BANKS.put("ENAT","Enat Bank");
  BANKS.put("ENATBANK","Enat Bank");
  BANKS.put("BUNNA","Bunna Bank");
  BANKS.put("BUNNABANK","Bunna Bank");
  BANKS.put("LION","Lion Bank");
  BANKS.put("LIONBANK","Lion Bank");
  BANKS.put("LIB","Lion Bank");
  BANKS.put("ANBESSA","Lion Bank");
  BANKS.put("TSEDAY","Tseday Bank");
  BANKS.put("TSEDAYBANK","Tseday Bank");
  BANKS.put("GLOBAL","Global Bank Ethiopia");
  BANKS.put("GLOBALBANK","Global Bank Ethiopia");
  BANKS.put("GLOBALBANKETHIOPIA","Global Bank Ethiopia");
  BANKS.put("GADAA","Gadaa Bank");
  BANKS.put("GADAABANK","Gadaa Bank");
  BANKS.put("HIJRA","Hijra Bank");
  BANKS.put("HIJRABANK","Hijra Bank");
  BANKS.put("ZAMZAM","ZamZam Bank");
  BANKS.put("ZAMZAMBANK","ZamZam Bank");
  BANKS.put("RAMIS","Ramis Bank");
  BANKS.put("RAMISBANK","Ramis Bank");
  BANKS.put("AHADU","Ahadu Bank");
  BANKS.put("AHADUBANK","Ahadu Bank");
  BANKS.put("SIDAMA","Sidama Bank");
  BANKS.put("SIDAMABANK","Sidama Bank");
 }
 static String bank(String sender){return BANKS.get(sender.replaceAll("[ _.-]", "").toUpperCase(java.util.Locale.US));}
}
