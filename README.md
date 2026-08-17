# Verb Explorer

React Verb Learning App — Initial Build

Build the first working version of a responsive React web app for learning Spanish verbs using interactive vocabulary cards.

The supplied JSON below contains the first 10 verb cards and is the initial sample dataset. Build the application so that the data layer is driven entirely by this JSON structure. Do not hard-code the card content into individual React components and do not invent additional cards.

Core requirements

Build the app in React.

Use the supplied JSON as the source of truth for all card data.

Create reusable components rather than building each card individually.

Create navigation between all main sections.

Make the entire application responsive for desktop, tablet and mobile.

Use Tailwind CSS for styling.

Use Framer Motion for subtle animations and transitions.

Use Local Storage to persist learner progress and favourites.

Keep the architecture ready for the JSON dataset to be expanded substantially beyond these first 10 cards.

Pages / sections

Create the following routes or equivalent navigation states:

Home

Create a welcoming dashboard showing:

App title

Short description

Number of available cards

Progress summary

Recently studied cards

Quick links to Browse, Search, Favourites and Quiz

The dashboard should feel like a polished learning application rather than a basic CRUD interface.

Browse

Display all available cards from the JSON dataset.

Include:

Responsive card grid

Verb

English meaning

Appropriate visual information from the JSON

Favourite control

Progress/learning state

Cards should be clickable and open their Card Detail view.

Card Detail

Create a detailed view for an individual verb.

Display all relevant information available for that verb in the supplied JSON.

Include:

Verb

English meaning

Conjugation/content supplied in the JSON

Examples where available

Favourite button

Mark as learned / progress control

Previous / next card navigation where appropriate

Do not invent fields that do not exist in the supplied data.

Search

Create a search interface that searches the JSON dataset.

Search should be able to find cards using the relevant textual fields, such as:

Spanish verb

English meaning

Other searchable text contained in the JSON

Results should update dynamically as the user types.

Favourites

Display verbs the learner has marked as favourites.

Favourite state must persist using Local Storage.

If there are no favourites, show a useful empty state rather than a blank page.

Quiz

Create the page and navigation for the Quiz feature, but for this first version it can be a polished placeholder.

It should clearly indicate that the quiz functionality will be added later.

Statistics

Create the page and navigation for Statistics.

For this first version, create a polished placeholder structure ready to display:

Cards studied

Cards learned

Favourites

Progress

Quiz performance

Use the Local Storage progress data where practical, but do not build the full statistics system yet.

Settings

Create a Settings page containing sensible placeholder/application settings.

Include an option to reset Local Storage progress with a confirmation step.

Do not include unnecessary settings that are not supported by the current application.

Data architecture

The JSON dataset must be treated as the application's source of truth.

Create a clean data-loading/data-access structure so that additional JSON cards can be added later without requiring changes to the React components.

Do not duplicate the card data throughout the application.

If a card has optional fields, the UI should handle missing fields gracefully.

Local Storage

Persist:

Favourite cards

Cards marked as learned

Basic progress information

Any other simple learner state required by the current UI

The application should restore this information when the user returns.

Do not use a backend or database for this first version.

UI / UX

The interface should feel like a modern language-learning application.

Use:

Clean typography

Clear visual hierarchy

Generous spacing

Rounded cards

Subtle shadows

Clear primary and secondary actions

Responsive navigation

Good empty states

Accessible buttons and controls

Mobile-friendly touch targets

Use Tailwind CSS rather than writing large amounts of custom CSS.

Use Framer Motion for restrained animations such as:

Page transitions

Card hover effects

Opening/closing interactions

Favourite feedback

Progress state changes

Do not over-animate the interface.

Navigation

Create a consistent navigation system with access to:

Home

Browse

Search

Favourites

Quiz

Statistics

Settings

On smaller screens, adapt the navigation appropriately rather than allowing it to overflow.

Important implementation rules

Do not invent additional vocabulary cards.

Do not alter the supplied Spanish or English content.

Do not hard-code the first 10 cards into UI components.

Use reusable React components.

Keep data separate from presentation.

Keep Local Storage logic separate from presentation where practical.

Make the application easy to extend when the full JSON dataset is supplied later.

Do not add authentication, payments, backend APIs or a database at this stage.

Do not build the full Quiz or Statistics functionality yet; create the structure and polished placeholders.

Make sure the application runs correctly with only the supplied 10 cards.

Initial dataset

The following JSON contains the first 10 verb cards. Use this exact data as the initial dataset:

["id": "ser-vs-estar",
"category": "verbs",
"title": "ser vs estar",
"tagline": "Both mean 'to be' — but ser is identity, estar is state. The rule about permanent vs temporary will get you in trouble.",
"sides": [
{
"word": "ser",
"core": "Ser encodes what something fundamentally is — identity, category, origin, material.",
"examples": [
{
"es": "Es aburrido.",
"en": "He's boring (as a person).",
"note": "His personality. Swap to está and he's just bored right now — totally different verdict."
},
{
"es": "La boda es en la iglesia.",
"en": "The wedding is at the church.",
"note": "Location of an event uses ser, not estar. Catches everyone out."
},
{
"es": "Es muy guapa.",
"en": "She's beautiful.",
"note": "Appearance as identity. But 'está muy guapa hoy' means she looks great today — she made an effort."
}
]
},
{
"word": "estar",
"core": "Estar encodes current state — how something is right now, not what it is.",
"examples": [
{
"es": "Está muerto.",
"en": "He's dead.",
"note": "Death is permanent but it's still a state the body is in. 'Es muerto' doesn't exist."
},
{
"es": "Este café está muy bueno.",
"en": "This coffee is really good.",
"note": "Quality you're experiencing right now. 'Es bueno' is a general verdict; 'está bueno' is tasting it."
},
{
"es": "Está listo.",
"en": "He's ready.",
"note": "Versus 'es listo' = he's clever. Same adjective, completely different meaning depending on verb."
}
]
}
],
"tricky": "Adjectives that flip meaning: listo (clever/ready), malo (bad/sick), bueno (good/tasty), vivo (sharp/alive), seguro (safe/certain)."
},
{
"id": "fue-vs-era",
"category": "verbs",
"title": "fue vs era",
"tagline": "Both are past tense of ser — fue is a completed snapshot, era is the background scenery.",
"sides": [
{
"word": "fue",
"core": "Preterite — the event happened, it's done, you're delivering a verdict on it.",
"examples": [
{
"es": "Fue una noche increíble.",
"en": "It was an incredible night.",
"note": "The night is over. You're wrapping it up. Preterite = closing the bracket."
},
{
"es": "Fue mi mejor amigo.",
"en": "He was my best friend.",
"note": "That friendship has ended — he moved away, you fell out, or he died. Fue signals it's finished."
},
{
"es": "¿Cómo fue la entrevista?",
"en": "How did the interview go?",
"note": "Asking for an overall verdict on a completed event."
}
]
},
{
"word": "era",
"core": "Imperfect — ongoing background state, what was true across a whole period.",
"examples": [
{
"es": "Cuando era niño, era muy tímido.",
"en": "When I was a child, I was very shy.",
"note": "No specific moment — a quality that lasted across years of childhood."
},
{
"es": "Era un día tranquilo cuando llegó la noticia.",
"en": "It was a quiet day when the news arrived.",
"note": "Era sets the atmosphere; llegó (preterite) is the event that cut through it."
},
{
"es": "Era mi amigo.",
"en": "He was my friend (back then).",
"note": "Just remembering a time — no implication the friendship ended badly. Compare fue mi amigo."
}
]
}
],
"tricky": "'Fue' vs 'era' with the same sentence changes meaning: 'fue mi amigo' (friendship ended) vs 'era mi amigo' (fond memory of a time). Native speakers feel this immediately."
},
{
"id": "por-vs-para",
"category": "verbs",
"title": "por vs para",
"tagline": "Para points forward to a goal or recipient. Por looks back at cause, exchange, or movement through.",
"sides": [
{
"word": "para",
"core": "Destination, purpose, recipient, deadline, or a surprising contrast given the subject.",
"examples": [
{
"es": "Lo hice para ti.",
"en": "I did it for you (you'll benefit).",
"note": "The action is aimed at you as its destination. Compare: 'lo hice por ti' = because of you / for your sake."
},
{
"es": "Para ser extranjero, hablas muy bien.",
"en": "For a foreigner, you speak really well.",
"note": "Sets up a contrast — given what you are, this is unexpected. A sideways compliment."
},
{
"es": "Lo necesito para el lunes.",
"en": "I need it by Monday.",
"note": "Monday is the deadline — the destination in time. Por lunes would mean 'around Monday.'"
}
]
},
{
"word": "por",
"core": "Cause, exchange, duration, movement through space, or on behalf of.",
"examples": [
{
"es": "Lo hice por ti.",
"en": "I did it because of you / for your sake.",
"note": "You're the reason, not the recipient. The motivation, not the destination."
},
{
"es": "Caminamos por la playa.",
"en": "We walked along the beach.",
"note": "Movement through or along. Para la playa would mean you were heading to the beach as a destination."
},
{
"es": "Estuve enfermo por una semana.",
"en": "I was ill for a week.",
"note": "Duration. How long the state lasted. Para una semana would imply a deadline."
}
]
}
],
"tricky": "'Gracias por todo' uses por (exchange — you're acknowledging what they gave). Never 'gracias para.' And 'por' in passive voice: 'fue escrito por Cervantes' = written by Cervantes."
},
{
"id": "saber-vs-conocer",
"category": "verbs",
"title": "saber vs conocer",
"tagline": "Saber is knowing facts and skills. Conocer is familiarity through experience — people, places, things you've encountered.",
"sides": [
{
"word": "saber",
"core": "Knowing information, knowing how to do something, or knowing a fact.",
"examples": [
{
"es": "Sé hablar español.",
"en": "I know how to speak Spanish.",
"note": "Ability or skill always uses saber. 'Conozco hablar' simply doesn't work."
},
{
"es": "¿Sabes dónde está la farmacia?",
"en": "Do you know where the pharmacy is?",
"note": "A piece of information — its location. Conocer would mean you've personally visited it."
},
{
"es": "No sé qué decirte.",
"en": "I don't know what to tell you.",
"note": "Knowing what to say = information/ability. Natural and very common."
}
]
},
{
"word": "conocer",
"core": "Personal familiarity — you've been there, met them, experienced it firsthand.",
"examples": [
{
"es": "Conozco Madrid muy bien.",
"en": "I know Madrid really well.",
"note": "You've lived there, walked its streets. Not information about Madrid — the city itself through experience."
},
{
"es": "¿Conoces este libro?",
"en": "Have you come across this book?",
"note": "You can 'conocer' a book — it means you've encountered it. Not the same as knowing its contents (saber)."
},
{
"es": "No la conozco en persona.",
"en": "I don't know her in person.",
"note": "Meeting someone personally = conocer. 'Sé quién es' means I know who she is — just information."
}
]
}
],
"tricky": "'Sé que es famoso' (I know he's famous — a fact) vs 'lo conozco' (I know him — we've met). The distinction maps cleanly to French savoir/connaître or German wissen/kennen."
},
{
"id": "salir-vs-quedar",
"category": "verbs",
"title": "salir vs quedar",
"tagline": "Quedar is making the plan to meet. Salir is the activity of going out. You can have one without the other.",
"sides": [
{
"word": "salir",
"core": "Going out — leaving the house, doing an activity, or dating someone.",
"examples": [
{
"es": "Salí con mis amigos anoche.",
"en": "I went out with my friends last night.",
"note": "The activity — you went somewhere together. The evening happened."
},
{
"es": "¿Sales con alguien?",
"en": "Are you seeing someone? / Are you dating anyone?",
"note": "'Salir con alguien' also means to date. Context usually makes it clear, but worth knowing."
},
{
"es": "No me apetece salir esta noche.",
"en": "I don't feel like going out tonight.",
"note": "Salir = leaving the house. Quedar could still happen at home."
}
]
},
{
"word": "quedar",
"core": "Arranging to meet — the plan, the agreement, the arrangement. Common in Spain.",
"examples": [
{
"es": "¿Quedamos el viernes?",
"en": "Shall we meet up Friday? / Are we on for Friday?",
"note": "The arrangement itself. You could then go anywhere. Quedar is the plan, not the outing."
},
{
"es": "Quedé con ella pero al final no salimos.",
"en": "We arranged to meet but we didn't end up going out.",
"note": "Quedar (plan) without salir (activity). They're two separate things."
},
{
"es": "Quedamos en el bar de siempre.",
"en": "We arranged to meet at the usual bar.",
"note": "Quedar + en = where you're meeting. Very natural, very common in Spain."
}
]
}
],
"tricky": "In Latin America, 'quedar' for arranging to meet is less common — they'd say 'juntarse' or 'encontrarse.' If you're in Mexico saying '¿quedamos?' people might look confused."
},
{
"id": "llevar-vs-hacer",
"category": "verbs",
"title": "llevar vs hacer (time)",
"tagline": "Both express how long something has been going on — but they're built differently and can't be swapped.",
"sides": [
{
"word": "llevar",
"core": "How long you've been doing something continuously — built into the verb itself.",
"examples": [
{
"es": "Llevo tres años viviendo aquí.",
"en": "I've been living here for three years.",
"note": "Llevar + time + gerund. The ongoing action is baked in. Elegant and very Spanish."
},
{
"es": "Llevaba dos horas esperando.",
"en": "I'd been waiting for two hours.",
"note": "Imperfect of llevar for past ongoing. Works exactly the same way."
},
{
"es": "¿Cuánto llevas aprendiendo español?",
"en": "How long have you been learning Spanish?",
"note": "The natural way to ask. 'Hace cuánto' also works but this sounds more fluent."
}
]
},
{
"word": "hacer",
"core": "Hace + time + que — how long ago something started, or how long since something happened.",
"examples": [
{
"es": "Hace tres años que vivo aquí.",
"en": "I've been living here for three years.",
"note": "Same meaning as the llevar version but different structure. Both are correct; llevar feels more natural in speech."
},
{
"es": "Hace dos horas que te espero.",
"en": "I've been waiting for you for two hours.",
"note": "Emphasis on duration from the speaker's point of view. Slightly more dramatic than llevar."
},
{
"es": "Hacía mucho que no te veía.",
"en": "It had been a long time since I'd seen you.",
"note": "Imperfect hacer for past context. Common opener after a long absence."
}
]
}
],
"tricky": "English speakers often try 'estoy viviendo aquí por tres años' — wrong on two counts. Spanish doesn't use present continuous for ongoing duration, and por isn't used this way. Use llevar or hace."
},
{
"id": "pedir-vs-preguntar",
"category": "verbs",
"title": "pedir vs preguntar",
"tagline": "Preguntar is asking a question. Pedir is asking for something — a request, an order, a demand.",
"sides": [
{
"word": "pedir",
"core": "To request, to order, to ask for something — you want something from someone.",
"examples": [
{
"es": "Pidió un café con leche.",
"en": "He ordered a white coffee.",
"note": "Ordering food and drink is always pedir. Never preguntar."
},
{
"es": "Te pido que me escuches.",
"en": "I'm asking you to listen to me.",
"note": "Pedir + que + subjunctive for making requests of people."
},
{
"es": "Me pidió perdón.",
"en": "He apologised to me.",
"note": "'Pedir perdón' = to apologise. A fixed phrase — you're requesting forgiveness."
}
]
},
{
"word": "preguntar",
"core": "To ask a question — you want information, not a thing.",
"examples": [
{
"es": "Me preguntó cómo me llamaba.",
"en": "She asked me what my name was.",
"note": "Seeking information. Preguntar + indirect question."
},
{
"es": "Pregúntale a él, yo no sé.",
"en": "Ask him, I don't know.",
"note": "Directing someone to ask elsewhere. Always preguntar for questions."
},
{
"es": "Me pregunto si vendrá.",
"en": "I wonder if he'll come.",
"note": "Preguntarse = to wonder. A reflexive use that English speakers often miss."
}
]
}
],
"tricky": "'Ask him for the bill' = 'pídele la cuenta' (request). 'Ask him what time it is' = 'pregúntale qué hora es' (question). The English verb 'ask' covers both — Spanish doesn't."
},
{
"id": "poder-vs-saber",
"category": "verbs",
"title": "poder vs saber (can)",
"tagline": "Both translate as 'can' — but poder is physical ability or permission, saber is knowing how.",
"sides": [
{
"word": "poder",
"core": "Can in the sense of being able to, being allowed to, or it being possible.",
"examples": [
{
"es": "No puedo venir mañana.",
"en": "I can't come tomorrow.",
"note": "Circumstantial — you're busy, unwell, not permitted. Not about skill."
},
{
"es": "¿Se puede fumar aquí?",
"en": "Can you smoke here? / Is smoking allowed?",
"note": "Impersonal poder for permission. Very natural way to ask if something is allowed."
},
{
"es": "Puede ser.",
"en": "Could be. / Maybe.",
"note": "One of the most useful phrases in Spanish. Possibility, not ability."
}
]
},
{
"word": "saber",
"core": "Can in the sense of knowing how — a skill you've learned.",
"examples": [
{
"es": "No sé nadar.",
"en": "I can't swim.",
"note": "You never learned. Poder here would mean you're physically prevented from swimming right now."
},
{
"es": "¿Sabes conducir?",
"en": "Can you drive? / Do you know how to drive?",
"note": "Skill. Poder conduces would mean 'are you allowed to drive' or 'are you in a state to drive.'"
},
{
"es": "De pequeña sabía tocar el piano.",
"en": "When she was little she could play piano.",
"note": "Past ability/skill. Podía here would imply she was allowed or physically capable — different meaning."
}
]
}
],
"tricky": "'¿Puedes tocar el piano?' = Are you able to right now / are you allowed to? '¿Sabes tocar el piano?' = Do you know how? The question you mean to ask is almost always saber."
},
{
"id": "deber-vs-tener-que",
"category": "verbs",
"title": "deber vs tener que",
"tagline": "Both mean 'must' or 'have to' — deber is moral obligation, tener que is practical necessity.",
"sides": [
{
"word": "deber",
"core": "Moral duty, obligation you owe — what you should do as a matter of principle.",
"examples": [
{
"es": "Debes ser honesto.",
"en": "You must be honest.",
"note": "Moral imperative. Tener que ser honesto would sound more like a practical requirement."
},
{
"es": "Debería llamarla.",
"en": "I should call her.",
"note": "Conditional of deber = should. The most natural way to express mild obligation in Spanish."
},
{
"es": "Debo de tener razón.",
"en": "I must be right. / I'm probably right.",
"note": "'Deber de' (with de) = probability, not obligation. 'Debo tener razón' = I have a duty to be right. Huge difference."
}
]
},
{
"word": "tener que",
"core": "Practical necessity — you have to do it because of circumstances.",
"examples": [
{
"es": "Tengo que irme, el tren sale en diez minutos.",
"en": "I have to go, the train leaves in ten minutes.",
"note": "External circumstance forcing the action. No moral dimension — just logistics."
},
{
"es": "Tienes que probar este vino.",
"en": "You have to try this wine.",
"note": "Strong recommendation. Tener que is common for this in everyday speech."
},
{
"es": "Tuve que mentir.",
"en": "I had to lie.",
"note": "Circumstances left no choice. Debí mentir would sound like you had a duty to lie — odd."
}
]
}
],
"tricky": "'Deber de + infinitive' (deduction: 'must be') vs 'deber + infinitive' (obligation: 'must do'). The tiny 'de' changes everything. 'Debe de estar cansado' = he must be tired. 'Debe estar aquí' = he's supposed to be here."
},
{
"id": "ir-vs-venir",
"category": "verbs",
"title": "ir vs venir",
"tagline": "Spanish anchors movement to where the speaker is right now — the opposite of English more often than you'd think.",
"sides": [
{
"word": "ir",
"core": "To go — movement away from the current location of the speaker.",
"examples": [
{
"es": "Voy al mercado.",
"en": "I'm going to the market.",
"note": "Speaker is leaving from where they are. Standard use."
},
{
"es": "¡Ya voy!",
"en": "I'm coming! / Coming!",
"note": "Spanish says 'I'm going' even when English says 'coming.' Because you're moving away from where you currently are toward them."
},
{
"es": "Fueron a Barcelona el verano pasado.",
"en": "They went to Barcelona last summer.",
"note": "Movement to somewhere away from the reference point — even in the past."
}
]
},
{
"word": "venir",
"core": "To come — movement toward the speaker's current location.",
"examples": [
{
"es": "¿Vienes a la fiesta?",
"en": "Are you coming to the party?",
"note": "The speaker is at (or going to) the party. They're inviting you to join where they'll be."
},
{
"es": "Ven aquí.",
"en": "Come here.",
"note": "Movement toward the speaker. The most basic use."
},
{
"es": "Vengo de trabajar.",
"en": "I'm coming from work.",
"note": "Venir de = coming from somewhere. The movement ends at the speaker's current position."
}
]
}
],
"tricky": "On the phone: '¿Puedes venir?' (Can you come here — to where I am?) vs '¿Puedo ir?' (Can I come — to where you are?). English uses 'come' for both. Spanish tracks the speaker's anchor point."
]

Completion criteria

The first version is complete when:

The app runs without errors.

All 10 supplied cards appear correctly.

Browse displays the cards responsively.

Clicking a card opens its detail view.

Search works against the supplied JSON.

Favourites work and persist after refreshing the page.

Basic learning/progress state persists after refreshing.

All navigation items work.

Quiz, Statistics and Settings have usable placeholder pages.

The UI works properly on desktop and mobile.

The code is structured so the 10-card dataset can later be replaced/expanded with a much larger JSON dataset without redesigning the application.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6380e654-32b7-41b1-ac5d-45a87ece7e8e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
