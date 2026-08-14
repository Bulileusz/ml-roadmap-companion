# Moduł nauki — zamknięty

**Status: wdrożony.** Ten plik był szkicem z diagnozą i otwartymi pytaniami;
zostaje jako zapis, *dlaczego* moduł wygląda tak, jak wygląda, i co świadomie
odrzucono. Jak działa — patrz README, sekcja „Tryb nauki".

## Skąd to się wzięło

Obserwacja użytkownika: „cały zamysł tego projektu to nauka ML, nie test mojej
wiedzy". Diagnoza po przejrzeniu schematu okazała się węższa niż zarzut, ale
realna.

**Czego nie zmieniono.** Fiszki i bank pytań to nie są narzędzia do *mierzenia*
wiedzy. Wyciąganie z pamięci samo w sobie **buduje** pamięć — skuteczniej niż
ponowne czytanie. To jeden z lepiej potwierdzonych efektów w badaniach nad
uczeniem się. Te moduły zostały.

**Co naprawiono wcześniej:** pytania nie miały gdzie trzymać odpowiedzi
(kolumna `answer`), nie było wiadomo, z czego się uczyć (moduł zasobów).

## 1. Przebieg zapoznawczy — zrobiony

Fiszka trafiała od razu do rotacji Leitnera z przyciskami „Umiałem / Nie
umiałem". Pierwsze spotkanie z kartą, której nigdy nie widziałeś, kończyło się
więc kliknięciem „Nie umiałem" — czyli zapisaniem porażki za to, że coś widzisz
po raz pierwszy. Psuło to zarówno statystyki, jak i nastawienie.

Jest: przód i tył razem, bez oceniania, „rozumiem, dalej", a dopiero potem
pudełko 1 i normalna rotacja z terminem nazajutrz.

**Odpowiedzi na otwarte pytania ze szkicu:**

- *Gdzie trzymać stan „poznana / niepoznana"?* — nullable `flashcards.learned_at`
  (migracja 7), nie osobna tabela. Kolumna niesie też **kiedy**, co osobna tabela
  dawałaby dopiero z drugim polem. Istniejące fiszki dostały backfill datą
  utworzenia: karta w pudełku 4 nie ma czego się zapoznawać.
- *Czy `NEW_CARDS_PER_DAY` zostaje?* — **nie**. Rozkładanie importu na dni
  chroniło przed lawiną powtórek po wgraniu startera, ale to samo robi teraz
  kolejka zapoznawcza, i robi to lepiej: karta nie jest wymagalna, dopóki jej nie
  poznasz, niezależnie od tego, ile ich wgrałeś. Dwa throttle naraz przeszkadzały
  sobie wzajemnie — fiszka odłożona o pięć dni *i* czekająca na zapoznanie
  znikała z widoku na tydzień bez powodu. Limit przeniósł się na jedną sesję
  (`INTROS_PER_SESSION` w `services/session.py`).
- *Czy zapoznanie liczy się do dziennika?* — **tak**, jako `card_intro`. To
  realna nauka, a dziennik ma odpowiadać na pytanie „czy tego dnia się uczyłem",
  nie „czy zdałem test". Wymagało to migracji 6, zdejmującej `CHECK`
  z `activity_log.kind`.
- *Osobna strona czy sekcja?* — **ani jedno, ani drugie**: zapoznanie jest
  pierwszym etapem sesji dnia. Osobna strona byłaby kolejnym miejscem do
  odwiedzenia z pamięci, czyli dokładnie problemem, który sesja rozwiązuje.

## 2. Notatka własnymi słowami — zrobiona

Tył fiszki to cudze sformułowanie. Wyjaśnienie czegoś **samemu sobie** utrwala
mocniej (efekt generowania).

- *Kolumna czy tabela?* — kolumna `flashcards.own_note`, dopóki notatka jest jedna
  na fiszkę. Pusta jest legalnym stanem „jeszcze nie napisana", tak samo jak
  pusta odpowiedź przy pytaniu.
- *Widoczna przed odsłonięciem tyłu?* — **nie**. Byłaby podpowiedzią i zabiłaby
  sens wyciągania z pamięci.
- *Czy import z `content/` ma jej dotykać?* — **nie**. To treść wyłącznie
  użytkownika; obowiązuje ta sama zasada co przy odpowiedziach do pytań: import
  wypełnia luki, nigdy nie zastępuje twojej treści.
- *Czy brak notatki po N powtórkach sygnalizować?* — **nie zrobione i celowo**.
  Ryzyko zamiany narzędzia nauki w kolejną listę obowiązków jest większe niż
  zysk. Do rozważenia, gdyby okazało się, że pole stoi puste miesiącami.

## Czego świadomie nie zrobiono

- **Nie zmieniono algorytmu Leitnera.** `BOX_INTERVALS_DAYS` zostaje takie, jakie
  było: interwały działają, a mieszanie zmiany UX ze zmianą harmonogramu
  utrudniłoby ocenę, co pomogło.
- **Nie dołożono kafelka „do poznania" obok czterech istniejących** w wersji
  streamlitowej — tam rząd metryk układał się 2×2 na telefonie i piąty psuł
  układ. W Reakcie kafelki są w gridzie, który sam się zawija, więc ograniczenie
  zniknęło i licznik kolejki zapoznawczej ma własne miejsce.
