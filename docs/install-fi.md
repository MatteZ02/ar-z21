# Throttle: asennus ja käytön aloitus

Throttle on kerhon sovellus, jolla ajetaan radan junia puhelimella tai tabletilla. Se yhdistää
radan Roco Z21 -keskusyksikköön radan Wi-Fi-verkon kautta.

- Tunnusta ei tarvita, eikä sovellus käytä internetiä.
- Veturit, kuvat ja asetukset tallentuvat vain omaan puhelimeesi.
- Sovellus on vielä testivaiheessa (versio 0.x). Kerro, jos jokin toimii oudosti (ks. ohjeen
  loppu).
- Sovellus on englanninkielinen. Tässä ohjeessa painikkeiden nimet on kirjoitettu niin kuin ne
  näkyvät sovelluksessa, **lihavoituna**.

Siirry oman puhelimesi kohtaan: [Android](#android) · [iPhone ja iPad](#iphone-ja-ipad)

## Android

Throttle ei ole Google Play -kaupassa, vaan se ladataan kerhon GitHub-sivulta. Se on turvallista,
mutta Android pyytää vahvistamaan asian muutaman kerran.

### Asennus

1. Avaa puhelimella tämä sivu: **<linkki julkaisusivulle>**
2. Napauta uusimman version kohdalta tiedostoa **`throttle-…apk`**. Puhelin lataa sen.
3. Avaa ladattu tiedosto: napauta ilmoitusta latauksen valmistumisesta, tai avaa **Tiedostot**
   (Files) -sovellus ja katso kansiosta **Lataukset** (Downloads).
4. Android ilmoittaa, ettei tästä lähteestä saa asentaa sovelluksia. Napauta **Asetukset**
   (Settings), laita päälle **Salli tästä lähteestä** (Allow from this source) ja palaa takaisin.
5. Napauta **Asenna** (Install).
6. Google Play Protect saattaa varoittaa tuntemattomasta sovelluksesta. Napauta **Lisätietoja**
   (More details) ja sitten **Asenna silti** (Install anyway). Sanamuodot vaihtelevat hieman
   puhelimesta toiseen. Varoitus on tavallinen sovelluksille, jotka eivät ole Play-kaupassa.
7. Avaa **Throttle**.

### Ensimmäinen käynnistys

Android 17:ssä ja uudemmissa sovellus kysyy lupaa löytää lähellä olevia laitteita ja yhdistää
niihin. Napauta **Salli** (Allow). Sovellus tarvitsee luvan tavoittaakseen keskusyksikön
Wi-Fi-verkossa. Vanhemmat Android-versiot eivät kysy.

Jos napautit vahingossa **Älä salli** (Don't allow), sovellus näyttää tumman palkin, jossa on
painike **Open settings**. Napauta sitä, valitse **Käyttöoikeudet → Lähellä olevat laitteet →
Salli** (Permissions → Nearby devices → Allow) ja palaa sovellukseen.

### Päivittäminen

Kun uusi versio ilmestyy, lataa se samalta sivulta ja asenna samalla tavalla. Se asentuu vanhan
päälle, ja veturit ja asetukset säilyvät.

**Älä poista sovellusta ennen päivitystä.** Poistaminen hävittää veturit ja kuvat.

## iPhone ja iPad

Aluksi Throttle asennetaan **TestFlightin** kautta. Se on Applen sovellus uusien sovellusten
testaamiseen. Myöhemmin Throttle tulee App Storeen linkin taakse (hakemalla sitä ei löydä).

### Asennus TestFlightilla

1. Avaa kerholta saamasi kutsulinkki: **<TestFlight-linkki>**
2. Jos puhelimessa ei vielä ole **TestFlight**-sovellusta, sivu ohjaa App Storeen hakemaan sen.
   Asenna se ja avaa linkki uudelleen.
3. Napauta TestFlightissa **Accept** ja sitten **Install**.
4. Avaa **Throttle**.

TestFlight päivittää sovelluksen, kun uusi versio tulee (tai näyttää **Update**-painikkeen).
Testiversio lakkaa toimimasta 90 päivän jälkeen; siihen mennessä tarjolla on uudempi.

### Ensimmäinen käynnistys

Sovellus kysyy, saako se etsiä ja yhdistää paikallisverkon laitteisiin. Napauta **Salli**
(Allow). Ilman lupaa sovellus ei tavoita keskusyksikköä, eikä iPhone kerro syytä.

Jos napautit **Älä salli** (Don't Allow): avaa iPhonen **Asetukset → Tietosuoja ja turvallisuus →
Paikallisverkko** ja laita **Throttle** päälle.

Sovellus pyytää lupaa kameraan tai kuviin vasta, kun lisäät veturille kuvan.

## Yhdistäminen rataan

1. Yhdistä puhelin **radan Wi-Fi-verkkoon**. Verkon nimen ja salasanan saat kerholta.
2. Radan verkossa ei ole internetiä. Puhelin voi ilmoittaa **Ei internetyhteyttä** tai tarjota
   vaihtoa mobiilidataan tai toiseen verkkoon. Valitse, että **pysyt** radan verkossa.
3. Avaa Throttle. Oikeassa yläkulmassa näkyy:
   - **Online** (vihreä): yhteys on. Voit ajaa.
   - **Wait**: yhdistetään.
   - **Offline** (punainen): ei yhteyttä.
4. Jos tila pysyy **Offline**-tilassa, napauta yhteyden tilaa (tai **Menu → Settings**).
   Tarkista, että **IP address** on kerholta saamasi osoite, ja napauta **Connect**. Rocon
   oletusosoite on `192.168.0.111`.

## Ajaminen

- Avaa **Menu → Drive**.
- **Liukusäädin** säätää nopeuden. Veturin kuvan molemmin puolin olevat **nuolet** vaihtavat
  suunnan.
- **Toimintopainikkeet** (valot, äänet …) ovat vasemmalla. Lisää löytyy napauttamalla **C I,
  C II, C III**.
- Veturin oma **STOP** pysäyttää vain sen veturin.
- Toisen veturin valitset napauttamalla vasemman alakulman **ruudukkopainiketta**. Äskettäin
  ajetut veturit ovat näytön alareunassa.

### Punainen STOP ylhäällä

Näytön yläreunan punainen **STOP** pysäyttää **kaikki** radan junat heti.

- **Yksi napautus:** kaikki junat pysähtyvät. Raidevirta pysyy päällä.
- **Kaksi nopeaa napautusta:** kaikki junat pysähtyvät, ja myös **raidevirta katkaistaan**.
- Kun junat ovat pysähdyksissä, **Online**-merkinnän viereen tulee värillinen merkki:
  **STOPPED** (kaikki junat pysäytetty), **OFF** (raidevirta pois) tai **SHORT** (oikosulku).
  Jatka **napauttamalla tätä merkkiä**. Junat jatkavat samoilla nopeuksilla kuin ennen.

Sovellus ei koskaan kysy STOPista "oletko varma?", vaan toimii heti.

## Veturien tuonti Rocon Z21-sovelluksesta

Jos olet käyttänyt Rocon Z21-sovellusta, voit siirtää veturit, kuvat, toimintopainikkeet ja
veturiyhdistelmät (consists) Throttleen.

1. Vie (export) Rocon Z21-sovelluksessa ratasi ja tallenna **`.z21`**-tiedosto puhelimeen.
   iPhonessa valitse **Tallenna Tiedostoihin** (Save to Files).
2. Avaa Throttlessa **Menu → Vehicles → Import from Roco app → Choose export file** ja valitse
   tiedosto.
3. Sovellus näyttää, montako veturia se löysi. Jos samalla osoitteella oleva veturi on jo
   Throttlessa, valitse **Skip** (ohita), **Replace** (korvaa) tai **Keep both** (pidä
   molemmat).
4. Napauta **Import**. Jos kuvia on paljon, tämä voi kestää noin minuutin.

Rocon vientitiedostossa ei ole nopeusportaita, joten tuodut veturit saavat 128 porrasta. Voit
muuttaa tämän kunkin veturin kohdalta **Vehicles**-näkymässä.

## Jos jokin ei toimi

| Mitä näet                                                       | Mitä teet                                                                                                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Offline** tai **Wait** koko ajan                              | Onko puhelin **radan** Wi-Fi-verkossa (ei mobiilidatalla, ei kodin verkossa)? Onko keskusyksikkö päällä? Onko Settingsin IP-osoite oikein? |
| Tumma palkki "Throttle may not use the local network" (Android) | Napauta **Open settings → Käyttöoikeudet → Lähellä olevat laitteet → Salli**.                                                              |
| iPhonessa mikään ei yhdistä, eikä virheilmoitusta tule          | **Asetukset → Tietosuoja ja turvallisuus → Paikallisverkko → Throttle** päälle.                                                            |
| Palkki "This z21 start is locked"                               | Keskusyksikön lukitus pitää avata sovelluksilla ajamista varten. Kerro kerholle.                                                           |
| Punainen **SHORT**-merkki ylhäällä                              | Jokin radalla aiheuttaa oikosulun (usein suistunut vaunu). Poista syy ja kytke virta takaisin napauttamalla **SHORT**-merkkiä.             |
| "Also driven elsewhere" veturin kohdalla                        | Joku muu ajaa samaa veturia. Se on sallittua; näet myös hänen muutoksensa.                                                                 |
| Tuonti ilmoittaa, ettei tiedostoa voi lukea                     | Valitse Rocon Z21-sovelluksesta viety `.z21`-tiedosto.                                                                                     |

Jotain muuta? Ilmoita siitä **<linkki GitHub Issuesiin>** tai kerro kerholle. Kerro, mikä
puhelin sinulla on ja mitä tapahtui.
