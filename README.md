# Rezerwacje gabinetu

1. Zainstaluj Node.js (LTS) z nodejs.org
2. W folderze projektu: `npm install`
3. Skopiuj `.env.example` jako `.env.local` i uzupełnij klucze z Firebase (Project settings -> Service accounts -> Generate new private key)
4. W Firebase -> Firestore -> Rules wklej zawartość pliku `firestore.rules` i kliknij Publish
5. `npm run dev` -> http://localhost:3000
6. Panel admina: /ukryty-admin (lub przytrzymaj logo 1,5 s), hasło = ADMIN_PASSWORD
7. Deploy: wrzuć na GitHub (prywatne repo) -> vercel.com -> Import -> dodaj 4 zmienne środowiskowe -> Deploy

Uwaga: przy pierwszym zapytaniu Firestore może poprosić o utworzenie indeksu
(w logach pojawi się link) - kliknij go i zatwierdź.
