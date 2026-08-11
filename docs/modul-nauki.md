# Moduł nauki — szkic, do przemyślenia w osobnej sesji

**Status: zalążek. Kodu nie ma i celowo go nie ma** — niedokończona funkcja
jest gorsza niż jej brak. Ten plik zbiera diagnozę i otwarte pytania, żeby
następna sesja nie zaczynała od zera.

## Skąd to się wzięło

Obserwacja użytkownika: „cały zamysł tego projektu to nauka ML, nie test
mojej wiedzy". Diagnoza po przejrzeniu schematu okazała się węższa niż zarzut,
ale realna.

**Czego nie zmieniamy.** Fiszki i bank pytań to nie są narzędzia do *mierzenia*
wiedzy. Wyciąganie z pamięci samo w sobie **buduje** pamięć — skuteczniej niż
ponowne czytanie. To jeden z lepiej potwierdzonych efektów w badaniach nad
uczeniem się. Te moduły zostają.

**Co już naprawiono** (jest w kodzie, nie w tym pliku):
- pytania nie miały gdzie trzymać odpowiedzi → kolumna `answer` + odsłanianie,
- nie było wiadomo, z czego się uczyć → moduł zasobów (`resources`).

**Co zostaje otwarte** — dwie rzeczy, obie dotyczą *pierwszego kontaktu*
z materiałem, a nie jego utrwalania.

## 1. Przebieg zapoznawczy dla nowej fiszki

Dziś fiszka trafia od razu do rotacji Leitnera z przyciskami „Umiałem /
Nie umiałem". Pierwsze spotkanie z kartą, której nigdy nie widziałeś, kończy
się więc kliknięciem „Nie umiałem" — czyli zapisaniem porażki za to, że coś
widzisz po raz pierwszy. To psuje zarówno statystyki, jak i nastawienie.

**Kierunek:** nowa fiszka najpierw idzie na przebieg zapoznawczy — przód i tył
pokazane **razem**, bez oceniania, przycisk „rozumiem, dalej". Dopiero po tym
wchodzi do pudełka 1 i normalnej rotacji.

**Otwarte pytania:**
- Gdzie trzymać stan „poznana / niepoznana"? Nowa kolumna `flashcards.learned_at`
  (nullable) wydaje się prostsza niż osobna tabela i nie psuje nic istniejącego.
- Czy `NEW_CARDS_PER_DAY` (dziś rozkłada napływ importu na dni) powinno zostać,
  czy przebieg zapoznawczy je zastępuje? Możliwe, że stagger przestaje być
  potrzebny, skoro nowe karty i tak nie wchodzą od razu do powtórek.
- Czy zapoznanie się liczy do dziennika (`activity_log`) jako aktywność?
  Prawdopodobnie tak — to realna nauka, a dziennik ma odpowiadać na pytanie
  „czy tego dnia się uczyłem".
- Czy przebieg zapoznawczy ma być osobną stroną, czy sekcją na stronie Fiszek
  nad „Dzisiejszymi powtórkami"?

## 2. Notatka własnymi słowami

Tył fiszki to cudze sformułowanie. Wyjaśnienie czegoś **samemu sobie** utrwala
mocniej niż przeczytanie cudzego opisu (efekt generowania). Dziś nie ma na to
miejsca — `tasks.notes` dotyczy zadania, nie pojęcia.

**Kierunek:** pole „moimi słowami" przy fiszce, wypełniane po odsłonięciu
odpowiedzi, widoczne przy kolejnych powtórkach.

**Otwarte pytania:**
- Kolumna `flashcards.own_note` czy osobna tabela? Kolumna wystarczy, dopóki
  notatka jest jedna na fiszkę.
- Czy notatka ma być widoczna **przed** odsłonięciem tyłu? Raczej nie —
  byłaby podpowiedzią i zabiłaby sens wyciągania z pamięci.
- Czy import z `content/` ma jej dotykać? **Nie.** To treść wyłącznie
  użytkownika; obowiązuje ta sama zasada co przy odpowiedziach do pytań —
  import wypełnia luki, nigdy nie zastępuje twojej treści.
- Czy brak notatki po N powtórkach powinien być jakoś sygnalizowany?
  Ryzyko: zamiana narzędzia nauki w kolejną listę obowiązków.

## Czego świadomie nie robić

- **Nie dokładać kolejnego kafelka na dashboard.** Rząd metryk ma już cztery
  pozycje i na telefonie układa się 2×2; piąty zepsuje ten układ.
- **Nie budować obu rzeczy naraz.** Przebieg zapoznawczy jest samodzielny
  i wart wdrożenia osobno; notatki mogą poczekać na to, czy pierwszy się
  przyjmie w codziennym użyciu.
- **Nie zmieniać algorytmu Leitnera.** Interwały działają, a mieszanie zmiany
  UX ze zmianą harmonogramu utrudni ocenę, co pomogło.
