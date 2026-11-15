package com.birrx.app;

import java.util.regex.*;
final class TransactionAlert {
    static String title(String raw, String bank, boolean hidden) {
        String text = raw.replaceAll("\\s+", " ");
        boolean outgoing = Pattern.compile("ልከዋል|አስተላልፈዋል|your payment of|transferred|\\bpaid\\b|repaid|debited|debit transaction", Pattern.CASE_INSENSITIVE).matcher(text).find();
        Matcher amount = Pattern.compile("(?:ETB\\s*([0-9][0-9,]*(?:\\.[0-9]{1,2})?)|repaid\\s+([0-9][0-9,]*(?:\\.[0-9]{1,2})?)\\s+ETB)", Pattern.CASE_INSENSITIVE).matcher(text);
        String value = "";
        if (amount.find()) {
            String number = amount.group(1) != null ? amount.group(1) : amount.group(2);
            try { value = new java.math.BigDecimal(number.replace(",", "")).stripTrailingZeros().toPlainString(); } catch (NumberFormatException ignored) {}
        }
        String person = "";
        Matcher peer = Pattern.compile("(?:transferred|paid|received)\\s+ETB\\s*[0-9,.]+\\s+(?:to|from)\\s+(.+?)(?:\\s*\\(|\\s+on\\s+)", Pattern.CASE_INSENSITIVE).matcher(text);
        Matcher account = Pattern.compile((outgoing ? "to" : "from") + " account\\s+[0-9*]+\\s*\\(([^)]+)\\)", Pattern.CASE_INSENSITIVE).matcher(text);
        if (peer.find()) person = peer.group(1).trim();
        else if (account.find()) person = account.group(1).trim();
        if ("Awash".equals(bank)) {
            Matcher parking = Pattern.compile("your payment of\\s*([0-9,.]+)\\s+ETB to\\s+(.+?)\\s+is successful",Pattern.CASE_INSENSITIVE).matcher(text);
            Matcher recipient = Pattern.compile("To\\s+[0-9*]+\\s*\\(([^)]+)\\)",Pattern.CASE_INSENSITIVE).matcher(text);
            Matcher from = Pattern.compile("credited to your account from\\s+(.+?)\\s+on\\s*:",Pattern.CASE_INSENSITIVE).matcher(text);
            if(parking.find()){value=new java.math.BigDecimal(parking.group(1).replace(",","")).stripTrailingZeros().toPlainString();person=parking.group(2).trim();}
            else if(recipient.find())person=recipient.group(1).trim();
            else if(from.find())person=from.group(1).trim();
        }
        if ("Telebirr".equals(bank) && text.contains("ብር")) {
            Matcher amharicAmount = Pattern.compile("([0-9][0-9,]*(?:\\.[0-9]{1,2})?)\\s+ብር").matcher(text);
            if (amharicAmount.find()) {
                try { value = new java.math.BigDecimal(amharicAmount.group(1).replace(",", "")).stripTrailingZeros().toPlainString(); } catch (NumberFormatException ignored) {}
            }
            Matcher amharicPeer = Pattern.compile("(?:ወደ|ከ)\\s+(.+?)\\s*\\([+0-9*]+\\)").matcher(text);
            if (amharicPeer.find()) person = amharicPeer.group(1).trim();
        }
        if (person.matches("[+0-9* ]+") || person.length()>80) person="";
        String prefix = hidden ? (outgoing ? "Outgoing transaction" : "Incoming transaction") : value.isEmpty() ? "New " + bank + " transaction" : (outgoing ? "-" : "+") + value + " ETB";
        return prefix + (person.isEmpty() ? " · " + bank : " · " + (outgoing ? "to " : "from ") + person);
    }
}
