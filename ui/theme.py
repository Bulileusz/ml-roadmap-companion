"""Warstwa designu: tokeny, prymitywy prezentacyjne i jedyny blok CSS.

Zero domeny i zero bazy - ten moduł importuje każda strona, więc musi zostać
wolny od cykli.

Podział odpowiedzialności z `.streamlit/config.toml`: co da się wyrazić
tokenem motywu, siedzi w configu (front Streamlita czyta to sam i nie
rozjedzie się przy aktualizacji). Tutaj zostaje wyłącznie to, czego tokeny
nie obsługują.
"""

import streamlit as st

APP_NAME = "ML Roadmap Companion"

# Tokeny lustrują wartości z .streamlit/config.toml. Duplikacja jest
# świadoma i nieusuwalna: Streamlit nie wystawia motywu jako zmiennych CSS
# (jedyne --* w buildzie należą do glide-data-grid i mermaida), a theming
# idzie przez emotion z generowanymi klasami. CSS poniżej musi więc dostać
# wartości literalnie. Trzymamy tu tylko te, których faktycznie używamy.
ACCENT = "#3FB950"
ACCENT_DIM = "#238636"  # postęp: czyta się jako postęp, nie krzyczy jak akcja
TEXT_MUTED = "#8B949E"
RULE = "#21262D"  # ciemniejsze od borderColor - kreska ma nie siekać strony

# Stos monospace zamiast samego "monospace": chcemy tej samej czcionki, jaką
# dostaje reszta motywu z codeFont, a goły generyk daje na Windowsie Courier.
MONO = 'ui-monospace, "Cascadia Mono", "Segoe UI Mono", Consolas, monospace'

# Szerokość kafelka metryki w pikselach. Stała, a nie "stretch", bo to ona
# decyduje, ile kafelków zmieści się w rzędzie przed zawinięciem: przy 390 px
# ekranu wychodzą dwa, przy szerokim - wszystkie cztery. Mieszka tutaj, bo
# korzystają z niej trzy różne moduły ui/.
METRIC_WIDTH = 170

# Selektory data-testid nie są publicznym API Streamlita - wszystkie poniżej
# sprawdzone w buildzie 1.59.1, nie wzięte z pamięci. Gdyby aktualizacja je
# przestawiła, apka nie przestanie działać: straci tylko szlif, a naprawa
# ogranicza się do tego jednego bloku.
_CSS = f"""
<style>
/* Streamlit zostawia u góry kilka rem pustego, co przy gęstym motywie
   wyglądało jak brakująca sekcja. */
[data-testid="stMainBlockContainer"] {{
    padding-top: 2.5rem;
    padding-bottom: 3rem;
}}

/* Wersaliki tylko dla st.title/header/subheader, nie dla nagłówków
   z markdownu - te ostatnie bywają treścią użytkownika (przód fiszki idzie
   jako "### ...") i krzyczałyby. Świadome odejście od domyślnego
   "sentence casing" Streamlita: motyw terminalowy to wybór projektowy.

   Rozróżnienie wymaga dwóch reguł, bo sprawdzony w DOM układ to
   stHeading > stMarkdownContainer > h1: sam prefiks stHeading nie
   wystarczy, skoro reset poniżej trafia w ten sam element. Dlatego reguła
   wersalików wymienia oba kontenery i wygrywa specyficznością (0,2,1 do
   0,1,1), niezależnie od kolejności w pliku. */
[data-testid="stHeading"] [data-testid="stMarkdownContainer"] h1,
[data-testid="stHeading"] [data-testid="stMarkdownContainer"] h2,
[data-testid="stHeading"] [data-testid="stMarkdownContainer"] h3 {{
    text-transform: uppercase;
    letter-spacing: 0.07em;
    /* Mono podane jawnie, bo reguła poniżej zdejmuje je z nagłówków
       markdownowych przez `inherit` - a prawdziwe nagłówki siedzą w tym
       samym kontenerze markdownu, więc bez tego traciłyby monospace
       razem z treścią. */
    font-family: {MONO};
}}
[data-testid="stMarkdownContainer"] h1,
[data-testid="stMarkdownContainer"] h2,
[data-testid="stMarkdownContainer"] h3 {{
    text-transform: none;
    letter-spacing: normal;
    /* `inherit`, a nie wpisany stos: bierzemy czcionkę bazową motywu bez
       powtarzania jej tutaj. headingFont=monospace z configu dotyczy też
       nagłówków markdownowych, a przód fiszki to zdanie po polsku czytane
       wiele razy dziennie - proza, nie listing. */
    font-family: inherit;
}}

/* st.divider() był jedynym separatorem w apce i przy tej liczbie sekcji
   krajał stronę na paski. Cieńsza i ciemniejsza kreska nadal dzieli, ale
   przestaje konkurować z treścią. */
hr {{
    border-top-color: {RULE};
    margin: 1.1rem 0;
}}

/* Cyfry tabelaryczne: bez tego wartości metryk skaczą w poziomie przy
   każdym przeliczeniu, bo domyślne cyfry proporcjonalne mają różne
   szerokości. Etykieta wersalikami, żeby kafelek czytał się jak wskaźnik,
   a nie jak zdanie. */
[data-testid="stMetricValue"] {{
    font-family: {MONO};
    font-variant-numeric: tabular-nums;
}}
[data-testid="stMetricLabel"] {{
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.72rem;
    color: {TEXT_MUTED};
}}
[data-testid="stMetricDelta"] {{
    font-variant-numeric: tabular-nums;
    font-size: 0.78rem;
}}

/* Zawężenie akcentu: zielen szla rownoczesnie na paski postepu, badge'y i
   przyciski, wiec przestala cokolwiek znaczyc. Paski dostaja przygaszona
   zielen, pelny akcent zostaje dla akcji (type="primary"). */
[data-testid="stProgressBarTrack"] > div {{
    background-color: {ACCENT_DIM};
}}

/* Nagłówek expandera monospace'em - nazwy faz czytają się wtedy jak
   pozycje listingu, a treść w środku zostaje bazową czcionką, bo fiszki
   i pytania to zdania do czytania, nie kod.

   Celujemy w akapit wewnątrz <summary>, nie w samo <summary>: emotion
   ustawia font-family na kontenerze markdownu, co blokuje dziedziczenie
   z rodzica (sprawdzone na wyrenderowanym DOM). */
[data-testid="stExpander"] summary [data-testid="stMarkdownContainer"] p {{
    font-family: {MONO};
    letter-spacing: 0.02em;
}}

/* Nawigacja stron w klimacie motywu - [theme.sidebar] w configu ustawia
   samo tło. */
[data-testid="stSidebarNavLink"] {{
    font-family: {MONO};
    font-size: 0.85rem;
}}

/* Widoczny focus dla klawiatury: domyślny ring przeglądarki gubi się na
   ciemnym tle. */
:focus-visible {{
    outline: 2px solid {ACCENT};
    outline-offset: 2px;
}}

/* Prompt pod tytułem ma być promptem, nie podświetlonym chipem kodu.
   `.st-key-*` to udokumentowany hook Streamlita na `key=` - stabilniejszy
   niż data-testid. */
.st-key-page-prompt code {{
    background: transparent;
    color: {TEXT_MUTED};
    padding-left: 0;
    padding-right: 0;
}}

/* Powierzchnia odpowiedzi (patrz answer_surface): lewa krawędź w akcencie
   odróżnia "oto odpowiedź" od zwykłego kontenera z ramką. Selektor po
   prefiksie, bo każde wywołanie ma własny klucz - inaczej dwie odpowiedzi
   na jednej stronie dzieliłyby key, czego Streamlit nie dopuszcza. */
[class*="st-key-answer-"] {{
    border-left: 3px solid {ACCENT};
}}

/* Telefon: 28 px monospace'em, wersalikami i z rozstrzeleniem nie mieści
   "ML ROADMAP COMPANION" w 390 px - tytuł rozpychał stronę w poziomie
   i wychodził za krawędź. Sprawdzone na zrzucie przy 390 px, bo apka jest
   świadomie projektowana pod telefon. */
@media (max-width: 640px) {{
    [data-testid="stHeading"] [data-testid="stMarkdownContainer"] h1 {{
        font-size: 19px;
        letter-spacing: 0.04em;
    }}
    [data-testid="stMainBlockContainer"] {{
        padding-top: 1.75rem;
    }}
}}

/* Nic nie ma prawa rozpychać strony w poziomie - długie terminy w tytułach
   fiszek i nazwy faz łamiemy, zamiast dodawać poziomy pasek przewijania. */
[data-testid="stHeading"] h1,
[data-testid="stHeading"] h2,
[data-testid="stHeading"] h3,
[data-testid="stMarkdownContainer"] h1,
[data-testid="stMarkdownContainer"] h2,
[data-testid="stMarkdownContainer"] h3 {{
    overflow-wrap: break-word;
}}
</style>
"""


def inject_css() -> None:
    """Wstrzykuje jedyny blok CSS w apce. Wołane z page_setup().

    Celowo `st.markdown`, a nie `st.html`: to drugie sanityzuje treść
    DOMPurify i przy tym arkuszu wycinało go w całości (prosty blok
    przechodził, ten nie - sprawdzone na wyrenderowanej stronie, nie
    w teorii). `st.markdown` z unsafe_allow_html nie przechodzi przez
    sanitizer i jest udokumentowanym sposobem podania CSS-u.
    """
    st.markdown(_CSS, unsafe_allow_html=True)


def page_setup(
    title: str, icon: str, command: str, caption: str | None = None
) -> None:
    """Konfiguruje stronę i rysuje jej nagłówek.

    Poza `set_page_config` robi też widoczny nagłówek, bo wcześniej każda
    strona składała go ręcznie z `st.title` i promptu - sześć kopii tego
    samego motywu, każda do osobnej zmiany.

    `command` to sam przełącznik (np. "--status"); nazwa programu dokłada
    się tutaj, żeby była w jednym miejscu.
    """
    page_title = title if title == APP_NAME else f"{title} · {APP_NAME}"
    st.set_page_config(page_title=page_title, page_icon=icon, layout="wide")
    inject_css()

    st.title(f"{icon} {title}")
    with st.container(key="page-prompt"):
        st.caption(f"`$ ml-roadmap {command}`")
    if caption:
        st.caption(caption)


def badge(label: str, color: str = "gray") -> str:
    """Markdown badge'a - jeden idiom w całej apce.

    Zwraca string, a nie rysuje, bo większość wywołań wkleja badge w dłuższą
    linię markdownu obok tytułu. Kolory zostają w modułach domenowych:
    pudełko Leitnera czy status materiału to znaczenie, nie decyzja
    wizualna - tutaj ujednolicamy tylko sposób rysowania.
    """
    return f":{color}-badge[{label}]"


def empty_state(text: str) -> None:
    """Pusty stan: nie ma jeszcze danych, dodaj pierwsze.

    Przygaszony tekst, a nie kolorowa ramka - brak zawartości nie jest
    zdarzeniem, o którym trzeba krzyczeć.
    """
    st.caption(text)


def answer_surface(text: str, key: str) -> None:
    """Powierzchnia odpowiedzi: tył fiszki, odpowiedź na pytanie.

    Wcześniej służył do tego `st.info()`, czyli ramka "informacyjna" - ta
    sama, którą apka mówi o wyniku importu. Odsłonięcie odpowiedzi to
    najważniejszy moment w całej apce i dostaje własną powierzchnię.

    `key` musi być unikalny w obrębie strony; podawaj id rekordu.
    """
    with st.container(border=True, key=f"answer-{key}"):
        st.markdown(text)


def all_done(text: str) -> None:
    """Stan "nic nie zostało" - w odróżnieniu od empty_state() to sukces.

    Rozdzielone świadomie: "brak fiszek, dodaj pierwszą" i "wszystkie
    powtórki na dziś zrobione" wyglądały wcześniej tak samo albo odwrotnie
    niż powinny.
    """
    st.success(text, icon=":material/check_circle:")
