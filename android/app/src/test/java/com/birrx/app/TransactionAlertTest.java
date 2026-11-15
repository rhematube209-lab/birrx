package com.birrx.app;
import org.junit.Test;
import static org.junit.Assert.assertEquals;
public class TransactionAlertTest {
    @Test public void amharicOutgoingShowsPrincipalAndPerson() {
        String body="ወደ Example Recipient(0977****00) 80.00 ብር በ 14/11/2026 15:04:00 ልከዋል። የአገልግሎት ክፍያው 0.87 ብር";
        assertEquals("-80 ETB · to Example Recipient", TransactionAlert.title(body,"Telebirr",false));
        assertEquals("Outgoing transaction · to Example Recipient", TransactionAlert.title(body,"Telebirr",true));
    }
    @Test public void amharicIncomingShowsPositiveAmount() {
        assertEquals("+600 ETB · from Example Sender", TransactionAlert.title("ከ Example Sender(2519****0000) 600.00 ብር በ 14/11/2026 16:42:21 ተቀብለዋል፡፡", "Telebirr",false));
    }
    @Test public void amharicBankOutgoingDoesNotUseAccountNumberAsAmount() {
        assertEquals("-2000 ETB · Telebirr", TransactionAlert.title("ከቴሌ ብር አካውንትዎ 251900000000 ለ Commercial Bank of Ethiopia አካውንት ቁጥር 1000000000000 2,000.00 ብር በቀን 14/11/2026 14:01:17 በተሳካ ሁኔታ አስተላልፈዋል፡፡", "Telebirr",false));
    }
}
