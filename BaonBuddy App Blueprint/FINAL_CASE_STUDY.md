# FINAL CASE STUDY

**Name of Proponents:**
GLODO, GERALD P.
SAHAGUN, JULIUS CEASAR D.
SANGUILA, KADAPHY L.
SESE, KIERBY ROLDAN
ZABALA, LEE P.

**Case Study Title**
BaonBuddy: Smart Daily Allowance and Micro-Tracking System

**Area of Investigation**
South East Asian Institute of Technology, Inc.  
National Highway, Crossing Rubber, Tupi, South Cotabato, Philippines

**Cited Problems**
- Lack of awareness of daily and weekly spending patterns due to untracked small expenses
- Difficulty in monitoring allowance when using both cash and digital money
- Overspending caused by absence of spending analysis and financial insights
- Late realization of low or insufficient allowance due to lack of timely alerts
- Dependence on internet connectivity for expense tracking and financial monitoring

**Functions of the Proposed System**
BaonBuddy is an offline-first financial management application designed specifically to help students efficiently monitor their daily allowances. The system allows users to securely log and categorize micro-expenses across both cash and digital wallets, dynamically calculating remaining balances in real-time. Leveraging an integrated AI-powered financial coach and offline analytics, the system continuously analyzes transaction data to provide personalized spending insights, detect spending anomalies, and predict burn rates. Additionally, it offers a voice-to-expense logging capability and smart low-balance alerts, ensuring that students can track their financial habits frictionlessly even without a reliable internet connection.

**Features of the Proposed System**
- **Offline-First Architecture**: Allows full expense logging, analytics, and security features without requiring internet connectivity using persistent local database storage.
- **AI Financial Coach & Anomaly Detection**: Generates personalized spending insights and highlights unusual, out-of-budget purchases through integrated algorithmic analysis via the Gemini framework.
- **Voice-to-Expense Logging**: Native microphone integration parses spoken audio to automatically extract, categorize, and log expense details seamlessly.
- **Dual Wallet System (Cash & Digital)**: Separates and precisely tracks balances across both physical cash and electronic wallets (e.g., GCash, PayMaya).
- **Smart Low-Balance Alerts & Burn Rate Prediction**: Notifies users of critical allowance levels and computationally predicts when funds will run out based on recent tracking habits.
- **Local MPIN Security & App Lock**: Secures the application data completely locally using a hashed MPIN mechanism, equipped with customized recovery question configurations.

**Programming Language and Database to be used:**
- **Front End:** React (TypeScript, Vite), Tailwind CSS, Capacitor, Ionic / Radix UI Components.
- **Back End:** Python, Node.js.
- **Database:** IndexedDB (localforage) for robust offline data.

**Reasons for the Choice**
BaonBuddy was specifically developed to tackle the unique financial constraints experienced by students managing strict daily allowances. Traditional budgeting applications are often overly complex, require persistent internet connections, or fail to accurately track the rapid micro-transactions common in a student's daily routine. Choosing to build an offline-first, AI-augmented tracking system guarantees that students—who may face intermittent connectivity on campus—gain immediate, uninterrupted access to their financial standing. The integration of advanced ease-of-use features such as voice logging and predictive analytics makes the task of budgeting less tedious, accelerating proper financial literacy effectively.

**Importance of the Study**
- **Students**: Obtain exact awareness over their micro-spending, allowing them to stretch their allowance further and drastically mitigate financial anxiety through simple tracking.
- **Parents and Guardians**: Gain peace of mind knowing that their dependents are cultivating disciplined money management habits supported by modern smart technologies.
- **Schools and Academic Institutions**: Benefit directly; a financially stable student body is often synonymous with a focused, stress-free academic environment, complementing overall campus welfare initiatives.
- **Researchers & Future Researchers**: Obtain a scalable foundational framework exhibiting the integration of artificial intelligence tools seamlessly into offline-first mobile environments.

**Target Users/ Beneficiaries**
- Senior High School Students
- College Students
- Allowance-Dependent Students
- Parents and Guardians
- Educational Institutions in the Philippines

**Marketing Efforts**
With student living expenses actively scaling due to inflation, the regional market has a critical need for an accessible, offline, and genuinely student-centric finance management tool. BaonBuddy aggressively targets a highly specific niche: the tracking of micro-allowances rather than salary macro-budgets. Our marketing efforts emphasize BaonBuddy's ultimate ease of use—exemplified by hands-free voice-recorded transactions—and unshakeable offline reliability. Promoting it as the necessary, intelligent "daily companion" for young adults transitioning to financial independence distinguishes it strongly from rigid corporate banking apps.

**Key Components of the Developed System**
- **Planning**: Involved initially identifying the core financial struggles of typical students, benchmarking existing budgeting tools, and establishing a robust technical requirement map heavily focusing on strict data privacy and absolute offline capability.
- **Design**: Concentrated on developing an incredibly friendly and responsive User Interface (UI). We established clear color-coded distinctions between cash and digital wallets and crafted highly accessible interactions, like the prominent central microphone button for intuitive voice-tracking.
- **Development**: Utilized React and Tailwind CSS for scalable frontend logic, securely hooking into IndexedDB through `localforage` for persistent multi-wallet data. Python APIs and the integration of the Gemini generic LLM were developed to power localized features like burn-rate calculations and transaction anomaly detections.
- **Testing**: Incorporated extensive debugging of local storage persistence across mock breakdown scenarios. We extensively checked offline capabilities via device emulators and conducted User Acceptance Testing (UAT) to measure the accuracy of anomaly detection rules and exact balance synchronization speeds.
- **Deployment**: Deployed completely as an optimized Android Application Package (APK) generated via Capacitor, making the system directly distributable to end-users' hardware phones. Key source code logic uses GitHub for version control integration.
- **Maintenance**: Structured to comfortably accept periodic updates to security protocols (MPIN hashing), UI optimizations aligned to newer Android OS updates, and fine-tuning prompt-engineering formulas for the integrated AI processor to ensure continuously sharp and accurate financial advice.

**Data Analysis**
Throughout development and observation, behavioral data indicated that implementing Voice-to-Expense logging substantially increased the frequency at which users log micro-transactions by destroying typical manual input friction. System testing proved the dual-wallet split was highly critical for mitigating the cognitive confusion students suffer between physical cash-on-hand versus e-wallet load. Furthermore, the anomaly detector algorithms triggered properly in simulated scenarios of impulsive high-cost spending, successfully acting as an active deterrent to help students recognize non-routine spending before their wallets zeroed out. The structural transition to a 100% offline-first engine ensured zero tracking delays across the board.

**Results**
The culmination of the study birthed a fully matured and successfully deployed BaonBuddy Android application functioning entirely independent of cloud servers for core wallet, categorical, and transaction operations. All real-time mathematical balance algorithms operated flawlessly, while the customized security environments reliably locked data behind zero-bypass hashed MPIN architectures. Ultimately, the application proved strongly effective in organizing daily allowances, minimizing the strenuous mental load required from students attempting to balance their academic lives with financial accountability simultaneously.

**Recommendation**
It is highly recommended that BaonBuddy undergoes further situational adaptation—such as direct collaboration with specific university canteens to securely integrate local QR-Code parsing without comprising the offline-first ideology. Later iterations should research implementing native Optical Character Recognition (OCR) models to scan and extract physical receipt data through the hardware camera directly. Expanding the app packaging logic to cover iOS (Apple) systems seamlessly utilizing Capacitor's native build structures would expand demographic reach significantly.

**Documentation** 
*(Please replace these bullet points with actual images showing proof of group work)*
- [Image 1 Placeholder]
- [Image 2 Placeholder]
- [Image 3 Placeholder]
- [Image 4 Placeholder]
- [Image 5 Placeholder]

**Source Code Link**
**GitHub Repository:** [https://github.com/Kierbz123/BaonBuddy.git](https://github.com/Kierbz123/BaonBuddy.git)
