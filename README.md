# 🏥 PSA Oxygen Generator Monitoring System

![PSA Generator Dashboard](public/logo-mgm.png)

A comprehensive, real-time IoT monitoring dashboard designed to track the performance and quality of Pressure Swing Adsorption (PSA) Oxygen Generators across multiple hospital stations. 

Built with scalability, reliability, and enterprise-grade QA/QC standards in mind.

---

## ✨ Key Features

- **Real-Time IoT Integration**: Continuously receives and parses live telemetry data from oxygen generators via **MQTT**.
- **Advanced Analytics Dashboard**: Aggregates vital metrics such as Oxygen Purity, Tank Pressure, Flow Rates, and Overall System Utilization.
- **Smart Status Derivation**: Automatically calculates machine health (Online, Offline, Warning, Critical) based on incoming telemetry metrics and predefined thresholds.
- **Role-Based Access Control (RBAC)**: Secure authentication via **JWT** handling different tiers of access (Admin, Operator, Viewer).
- **Smart TV Compatibility**: Specifically optimized for headless displays and Smart TVs (e.g., LG WebOS), utilizing robust memory management, uncontrolled form state patterns, and network timeout handlers.
- **Industrial Grade Testing**: Fully tested backend and frontend architecture utilizing **Vitest** and **React Testing Library**.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/) & React 19
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Database**: [PostgreSQL (TimescaleDB)](https://www.timescale.com/) for optimized time-series data storage
- **Authentication**: JWT (JSON Web Tokens) via `jose`
- **Testing**: [Vitest](https://vitest.dev/), [React Testing Library](https://testing-library.com/), and [Happy-DOM](https://github.com/capricorn86/happy-dom)
- **Package Manager**: [pnpm](https://pnpm.io/)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18.x or higher)
- **pnpm** (v9.x or higher)
- **PostgreSQL** instance with the **TimescaleDB** extension enabled.
- **MQTT Broker** (e.g., Mosquitto, EMQX) for IoT ingestion.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/psa-generator-dashboard.git
   cd psa-generator-dashboard
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory and add the following required keys:
   ```env
   # Database Configuration
   DATABASE_URL="postgres://user:password@localhost:5432/psadatabase"

   # Authentication
   JWT_SECRET="your-super-secret-key-min-32-chars"

   # MQTT Configuration
   MQTT_BROKER_URL="mqtt://localhost:1883"
   MQTT_USERNAME="your-mqtt-user"
   MQTT_PASSWORD="your-mqtt-password"
   ```

4. **Initialize Database**
   Run the database schema setup and seed initial data:
   ```bash
   pnpm run db:seed
   ```

### Running the Application

To start the Next.js development server:
```bash
pnpm run dev
```

To start the background MQTT listener for data ingestion (if running as a separate service):
```bash
pnpm run mqtt
```

Open [http://localhost:3300](http://localhost:3300) in your browser to view the application.

---

## 🧪 Testing & QA

This project enforces strict Quality Assurance (QA) standards. To run the automated test suite, which covers both the backend API logic and frontend UI hooks:

```bash
pnpm test
```

> **Note:** For a full breakdown of our testing methodology and coverage, please refer to the `QA_QC_REPORT.md` file included in this repository.

---

## 📂 Project Structure

```text
├── public/                 # Static assets (images, logos)
├── src/
│   ├── app/                # Next.js App Router endpoints and layouts
│   ├── backend/
│   │   ├── auth/           # JWT & Guard logic
│   │   ├── db/             # Drizzle schema, seeding, and Timescale setups
│   │   ├── mqtt/           # MQTT listeners and payload parsers
│   │   └── status/         # Logic for deriving machine health and statuses
│   ├── frontend/
│   │   ├── components/     # Reusable React components (shadcn & dashboard elements)
│   │   ├── hooks/          # Custom React hooks (e.g., useAuth)
│   │   └── lib/            # Frontend utilities and analytics calculators
│   └── shared/             # Shared TypeScript types between frontend and backend
├── tests/                  # Backend unit tests
├── QA_QC_REPORT.md         # Quality Assurance report & standards
└── vitest.config.mts       # Testing configuration
```
