# 🧟 DEADLOCK ZOMBIES - 2D CoD Wave Shooter with Deadlock Shop

Multiplayerowa gra 2D w klimacie **Call of Duty: Zombies** z autorskim sklepem ulepszeń postaci w stylu **Deadlocka** (drzewka Broń, Przetrwanie, Spirit). Całość działa bez instalacji bezpośrednio w przeglądarce i jest w 100% przygotowana do hostingu na **Fly.io**.

---

## 🎮 Najważniejsze Funkcje

- **Multiplayer w czasie rzeczywistym:** Do 4 graczy w jednym pokoju (z kodem zaproszenia lub solo).
- **Klasyczny rdzeń CoD Zombies:**
  - Fale zombie o rosnącej trudności, szybkości i zdrowiu.
  - Punkty za trafienia i eliminacje.
  - Kupowanie broni na ścianach (M1911, Strzelba Trench, Thompson SMG, Karabin M16).
  - Kupowanie przejść / otwieranie drzwi za punkty.
  - Skrzynia **Mystery Box** z losowaniem rzadkich broni, w tym **Ray Gun (Wonder Weapon)**!
  - Mechanika **Downed & Revive** (czołganie się po utracie HP i podnoszenie przez sojuszników).
  - Losowe Power-upy: **Bomba Atomowa (Nuke)**, **Insta-Kill**, **Maksymalna Amunicja (Max Ammo)**, **Podwójne Punkty (Double Points)**.
- **Sklep Ulepszeń Deadlocka (Klawisz `B`):**
  - **⚔️ Broń:** Większy magazynek, przebijanie wrogów (piercing), szybkostrzelność, bonus obrażeń.
  - **🛡️ Przetrwanie:** Bonus Max HP, pasywna regeneracja, kradzież życia (Bullet Lifesteal), szybszy bieg.
  - **🔮 Spirit:** Skrócenie czasu odnowienia dasha, wybuchowe granaty odłamkowe, wyładowania łańcuchowe (Tesla Bullets), zamrażanie zombie (Cryo).
- **Syntetyzowany Dźwięk Web Audio API:** Brak zewnętrznych plików mp3 – realistyczne strzały, przeładowania, ryk zombiaków i sygnały rund generowane w czasie rzeczywistym.
- **Zoptymalizowany pod Fly.io:** Wielostopniowy `Dockerfile` serwujący aplikację kliencką SPA i WebSockety na porcie 8080.

---

## 🕹️ Sterowanie

| Klawisz | Akcja |
|---|---|
| **W, A, S, D** | Poruszanie się gracza |
| **Myszka (Ruch)** | Celowanie w stronę kursora |
| **LPM (Lewy Przycisk)** | Strzał z aktualnej broni |
| **R** | Przeładowanie magazynka |
| **Spacja** | **Deadlock Dash** (odskok z czasem odnowienia) |
| **G** | Rzut granatem wybuchowym |
| **E** | Interakcja (drzwi, ściany z bronią, Mystery Box, reanimacja) |
| **B** lub **ESC** | Otwarcie / zamknięcie Sklepu Deadlocka |

---

## 🚀 Uruchomienie Lokalne

1. Uruchomienie serwera produkcyjnego:
   ```bash
   npm start
   ```
   Aplikacja będzie dostępna pod adresem: **http://localhost:8080**

2. Tryb developerski (hot-reload klienta Vite):
   ```bash
   npm run dev
   ```

---

## ☁️ Wdrożenie na Fly.io

Narzędzie `flyctl` zostało już zainstalowane na Twoim komputerze. Aby wdrożyć aplikację na chmurę Fly.io:

1. **Zaloguj się do Fly.io:**
   ```powershell
   fly auth login
   ```
   *(Otworzy się przeglądarka z prośbą o zalogowanie na Twoje darmowe konto Fly.io)*

2. **Wdróż grę:**
   ```powershell
   fly deploy
   ```
   *(Lub uruchom przygotowany skrypt `.\deploy-fly.ps1`)*

Po wdrożeniu Fly wygeneruje publiczny adres HTTPS (np. `https://deadlock-zombies-web.fly.dev`), do którego Ty i Twoi znajomi możecie wejść z dowolnego urządzenia!
