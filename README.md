# 🏪 Tindahan ni Duane — Developer Documentation

**Database Schema Reference · v2.0 · February 2026**

> This document explains every database table in the Tindahan ni Duane sari-sari store POS system — what each table stores, how tables relate to each other, and how the application reads and writes data. It is the first reference you should read before working on any feature.
>
> **Target audience: developers new to the codebase.**

---

## Table of Contents

1. [Overview](#1-overview)
   - [1.1 High-Level Architecture](#11-high-level-architecture)
   - [1.2 Key Design Principles](#12-key-design-principles)
2. [Catalog Domain](#2-catalog-domain)
   - [2.1 product_categories](#21-product_categories)
   - [2.2 units](#22-units)
   - [2.3 unit_conversions](#23-unit_conversions)
   - [2.4 products](#24-products)
   - [2.5 product_pricing](#25-product_pricing)
   - [2.6 product_units](#26-product_units)
3. [Bundle Domain](#3-bundle-domain)
   - [3.1 bundles](#31-bundles)
   - [3.2 bundle_items](#32-bundle_items)
4. [Inventory Domain](#4-inventory-domain)
   - [4.1 stock_batches](#41-stock_batches)
   - [4.2 stock_logs](#42-stock_logs)
5. [Sales Domain](#5-sales-domain)
   - [5.1 sales](#51-sales)
   - [5.2 sale_items](#52-sale_items)
   - [5.3 sale_bundle_items](#53-sale_bundle_items)
6. [Credit (Utang) Domain](#6-credit-utang-domain)
   - [6.1 customers](#61-customers)
   - [6.2 payment_types](#62-payment_types)
   - [6.3 credit_transactions](#63-credit_transactions)
   - [6.4 credit_payments](#64-credit_payments)
7. [Operations Domain](#7-operations-domain)
   - [7.1 expense_categories](#71-expense_categories)
   - [7.2 expenses](#72-expenses)
8. [Table Relationships](#8-table-relationships)
9. [Helper Functions (data.js)](#9-helper-functions-datajs)
   - [9.1 Pricing Helpers](#91-pricing-helpers)
   - [9.2 Credit Helpers](#92-credit-helpers)
   - [9.3 Other Helpers](#93-other-helpers)
10. [Common Workflows](#10-common-workflows)
    - [10.1 Processing a Sale (Checkout)](#101-processing-a-sale-checkout)
    - [10.2 Recording a Credit Payment](#102-recording-a-credit-payment)
    - [10.3 Adding or Editing a Product](#103-adding-or-editing-a-product)
    - [10.4 Logging a Stock Change](#104-logging-a-stock-change)
11. [Quick Reference](#11-quick-reference)
    - [11.1 All Tables at a Glance](#111-all-tables-at-a-glance)
    - [11.2 Column Nullability Legend](#112-column-nullability-legend)

---

## 1. Overview

Tindahan ni Duane is an in-browser sari-sari store POS system. All data lives in a single JavaScript object called `db` defined in `data.js`. There is no backend server or SQL database — the `db` object acts as the database and resets when the page is refreshed (demo mode). Despite this, the schema is designed to mirror a real relational database so the app can be migrated to an actual database (e.g., PostgreSQL, SQLite) with minimal changes.

### 1.1 High-Level Architecture

The schema is grouped into five functional domains:

| Domain            | Covers                                 |
| ----------------- | -------------------------------------- |
| 🟣 **Catalog**    | Products, units, pricing, bundles      |
| 🟢 **Inventory**  | Stock batches & logs                   |
| 🟠 **Sales**      | Transactions, cart items, bundles sold |
| 🔴 **Credit**     | Utang (credit sales) & repayments      |
| 🔵 **Operations** | Customers, expenses, categories        |

### 1.2 Key Design Principles

- **Soft deletes everywhere.** Records are never physically deleted. Instead an `is_active` flag is set to `false`. This preserves historical references in sales and credit records.

- **Append-only pricing history.** When a product's price changes, a new row is added to `product_pricing` with a new `effective_date`. The latest row is always the current price.

- **Price snapshotting at sale time.** `sale_items.unit_price` and `sale_items.total_price` store the exact price at the time of the sale so historical reports remain accurate even after price changes.

- **IDs managed in `db.nextId`.** Each table key holds the next available ID, incremented by `genId(type)` in `script.js`.

- **Foreign keys are plain integers.** Referential integrity is enforced in JavaScript logic, not by a database engine. Always use helper functions (`getProductPricing()`, `getCreditBalance()`, etc.) rather than accessing arrays directly.

---

## 2. Catalog Domain

The catalog domain describes what the store sells: products, how they are measured (units), their prices, and bundle deals.

### 2.1 `product_categories`

A simple lookup table for grouping products. Examples: Candy, Drinks, Snacks, Condiments.

| Field  | Type    | Nullable | Description                                                                                                     |
| ------ | ------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `id`   | integer | required | Primary key.                                                                                                    |
| `name` | string  | required | Display name of the category (e.g., `"Candy"`, `"Drinks"`). Shown in product filters and the POS category tabs. |

> 💡 **Usage:** The POS page reads all active product categories dynamically from `db.product_categories` to build the filter tab bar. Adding a new category here immediately makes it available in the product modal dropdown.

---

### 2.2 `units`

Defines every unit of measurement used anywhere in the app — for stock, sales, and bundle quantities.

| Field          | Type    | Nullable | Description                                                                 |
| -------------- | ------- | -------- | --------------------------------------------------------------------------- |
| `id`           | integer | required | Primary key.                                                                |
| `name`         | string  | required | Full unit name (e.g., `"piece"`, `"liter"`, `"kilogram"`).                  |
| `abbreviation` | string  | required | Short display form shown in POS and receipts (e.g., `"pc"`, `"L"`, `"kg"`). |

> 💡 **Usage:** `units.id` is referenced as a foreign key throughout the schema — `products`, `product_units`, `bundle_items`, `stock_batches`, `stock_logs`, and `sale_items` all use `unit_id`. Seed units carefully: removing or changing IDs breaks those references.

---

### 2.3 `unit_conversions`

Stores conversion factors between compatible units. Currently used for reference and future reporting (e.g., reconciling stock received in liters vs milliliters).

| Field          | Type    | Nullable | Description                                                                                                                    |
| -------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `id`           | integer | required | Primary key.                                                                                                                   |
| `from_unit_id` | integer | FK       | FK → `units.id`. The unit you are converting FROM.                                                                             |
| `to_unit_id`   | integer | FK       | FK → `units.id`. The unit you are converting TO.                                                                               |
| `factor`       | number  | required | Multiply the source quantity by this number to get the target quantity. Example: 1 liter × 1000 = 1000 ml, so factor = `1000`. |

---

### 2.4 `products`

The central catalog table. Each row is one stockable product. This table stores only identity and inventory information — pricing is stored separately in `product_pricing`.

| Field                 | Type    | Nullable | Description                                                                                                                                    |
| --------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                  | integer | required | Primary key.                                                                                                                                   |
| `name`                | string  | required | Display name of the product (e.g., `"Snow Bear"`, `"Coke 237ml"`).                                                                             |
| `unit_id`             | integer | FK       | FK → `units.id`. The **base unit** used for all stock counting. `stock_quantity` is always expressed in this unit.                             |
| `product_category_id` | integer | FK       | FK → `product_categories.id`. Groups the product for filtering in POS and reports.                                                             |
| `stock_quantity`      | number  | required | Current on-hand stock expressed in the product's base unit. Decremented on checkout; incremented via `stock_logs`.                             |
| `image_url`           | string  | nullable | Emoji character used as a visual icon in the POS grid and receipt. Automatically assigned based on category when saving via the product modal. |
| `is_active`           | boolean | required | Soft-delete flag. `false` = product is hidden from POS and product list but its historical `sale_items` records remain intact.                 |

> ⚠️ **Important:** Never hard-delete a product row. Set `is_active = false` instead. Sale history, credit transactions, and bundle definitions all reference product IDs — deleting a row breaks those lookups.

---

### 2.5 `product_pricing`

Stores the pricing history for each product. Every price change creates a new row — old rows are never updated. The row with the latest `effective_date` is always the current price.

| Field               | Type    | Nullable | Description                                                                                                                            |
| ------------------- | ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                | integer | required | Primary key.                                                                                                                           |
| `product_id`        | integer | FK       | FK → `products.id`.                                                                                                                    |
| `retail_price`      | number  | required | Price charged to a single customer (walk-in or small quantity).                                                                        |
| `wholesale_price`   | number  | required | Discounted price applied when `quantity_sold ≥ wholesale_min_qty`.                                                                     |
| `wholesale_min_qty` | integer | required | The minimum quantity that triggers wholesale pricing.                                                                                  |
| `effective_date`    | string  | required | ISO date string (`YYYY-MM-DD`). The date from which this price row applies. The row with the highest date ≤ today is the active price. |

> 💡 **Usage:** `getProductPricing(product_id)` returns the latest row. `getProductPricingAt(product_id, dateStr)` returns the price that was active on a past date — used when replaying historical sales.

---

### 2.6 `product_units`

Enables a product to be sold in more than one unit, each with its own price. Examples: Toyo (soy sauce) sold per piece `(pc)` at ₱5 **OR** per liter `(L)` at ₱45. When a product has rows in this table, the POS shows a unit-picker modal before adding to cart.

| Field               | Type    | Nullable | Description                                                                                                                                             |
| ------------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                | integer | required | Primary key.                                                                                                                                            |
| `product_id`        | integer | FK       | FK → `products.id`. The product this unit option belongs to.                                                                                            |
| `unit_id`           | integer | FK       | FK → `units.id`. The alternative unit being offered (e.g., liter, pack).                                                                                |
| `retail_price`      | number  | required | Retail price per unit of this specific unit type.                                                                                                       |
| `wholesale_price`   | number  | required | Wholesale price per unit of this type.                                                                                                                  |
| `wholesale_min_qty` | integer | required | Minimum quantity of this unit to trigger wholesale pricing.                                                                                             |
| `label`             | string  | nullable | Optional human-readable label shown in the unit picker (e.g., `"Per Liter (L)"`, `"Per Pack (pk)"`). If empty, the unit name from `units.name` is used. |

> 💡 **How pricing resolution works in the POS:** When the cashier picks a unit during a sale, the app calls `getProductUnitPricing(product_id, unit_id)`. If a matching `product_units` row is found, it uses that row's pricing. If no row is found (i.e., the customer chose the base unit), it falls back to the latest `product_pricing` row. This means `product_pricing` always acts as the default for the base unit.

> ⚠️ **Important:** `product_units` rows do **NOT** replace `product_pricing`. They are additive — you always need at least one `product_pricing` row per product for the base-unit price.

---

## 3. Bundle Domain

Bundles let the store offer special deals — either a multi-pack of the same product (e.g., 5 Snow Bears for ₱4) or a combination of different products (e.g., Coke + Chippy for ₱24).

### 3.1 `bundles`

The bundle header — stores the bundle's name, overall price, and active status.

| Field          | Type    | Nullable | Description                                                                                                       |
| -------------- | ------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| `id`           | integer | required | Primary key.                                                                                                      |
| `bundle_name`  | string  | required | Display name shown in the POS bundle view and cart (e.g., `"Merienda Combo"`, `"5-pc Snow Bear Deal"`).           |
| `bundle_price` | number  | required | The total price of the bundle as a single unit. This is snapshotted into `sale_items.unit_price` at time of sale. |
| `is_active`    | boolean | required | Soft-delete flag. Retired bundles are hidden from POS but sale history referencing them remains readable.         |

---

### 3.2 `bundle_items`

The line items that make up a bundle — which products are included, how many of each, and in what unit.

| Field        | Type    | Nullable | Description                                                                |
| ------------ | ------- | -------- | -------------------------------------------------------------------------- |
| `id`         | integer | required | Primary key.                                                               |
| `bundle_id`  | integer | FK       | FK → `bundles.id`.                                                         |
| `product_id` | integer | FK       | FK → `products.id`. The product included in this bundle slot.              |
| `unit_id`    | integer | FK       | FK → `units.id`. The unit in which the product is counted for this bundle. |
| `quantity`   | integer | required | How many of this product (in the given unit) are in one bundle.            |

> 💡 **How bundles work at checkout:** When a bundle is sold, one `sale_items` row is written for the bundle (`product_id = null`, `bundle_id` set). Then for each `bundle_items` row, a `sale_bundle_items` row records exactly how many units of each product were deducted from stock. This lets you trace every stock movement back to a specific bundle sale.

---

## 4. Inventory Domain

The inventory domain tracks how stock enters and leaves the store. It is split into two tables: `stock_batches` for inbound deliveries, and `stock_logs` for all individual stock movements.

### 4.1 `stock_batches`

Represents a single inbound delivery of a product (a shipment or purchase from a supplier). Batches allow tracking of expiration dates per delivery.

| Field               | Type    | Nullable | Description                                                                            |
| ------------------- | ------- | -------- | -------------------------------------------------------------------------------------- |
| `id`                | integer | required | Primary key.                                                                           |
| `product_id`        | integer | FK       | FK → `products.id`.                                                                    |
| `unit_id`           | integer | FK       | FK → `units.id`. Unit used to measure this batch (usually matches `products.unit_id`). |
| `quantity_received` | number  | required | How many units were received in this delivery.                                         |
| `expiration_date`   | string  | nullable | ISO date (`YYYY-MM-DD`). `null` if the product does not expire.                        |
| `created_at`        | string  | required | Date/time the batch was recorded.                                                      |
| `notes`             | string  | nullable | Free-text notes (e.g., `"Delivery from Supplier A"`).                                  |

---

### 4.2 `stock_logs`

An append-only audit trail of every stock change for every product. Each row records one movement — restock, sale, damage, expiry, or manual adjustment.

| Field            | Type    | Nullable | Description                                                                                                                                          |
| ---------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`             | integer | required | Primary key.                                                                                                                                         |
| `product_id`     | integer | FK       | FK → `products.id`.                                                                                                                                  |
| `unit_id`        | integer | FK       | FK → `units.id`. Unit of the `change_qty`.                                                                                                           |
| `stock_batch_id` | integer | nullable | FK → `stock_batches.id`. Links this log entry to the inbound batch that provided the stock. `null` for non-batch events (damage, adjustment, sales). |
| `change_qty`     | number  | required | Signed quantity: positive = stock added, negative = stock removed. Examples: `+200` restock, `-10` sold, `-2` damaged.                               |
| `reason`         | string  | required | One of: `restocked`, `sold`, `damaged`, `expired`, `adjustment`.                                                                                     |
| `notes`          | string  | nullable | Free-text explanation (e.g., `"Wet from leaking roof"`, `"Sale #12"`).                                                                               |
| `created_at`     | string  | required | Date/time the log was written.                                                                                                                       |

> ⚠️ **Important:** `products.stock_quantity` is the live count, updated directly on every checkout and stock log save. `stock_logs` is the audit trail — never update `stock_quantity` without also writing a `stock_logs` row. The Stock Logs page uses `stock_logs` for its display.

---

## 5. Sales Domain

The sales domain records every completed transaction. A sale is split across three tables: `sales` (the transaction header), `sale_items` (individual line items), and `sale_bundle_items` (individual product deductions for bundle sales).

### 5.1 `sales`

One row per completed checkout — the transaction header.

| Field             | Type    | Nullable | Description                                                         |
| ----------------- | ------- | -------- | ------------------------------------------------------------------- |
| `id`              | integer | required | Primary key.                                                        |
| `customer_id`     | integer | nullable | FK → `customers.id`. `null` if this is a walk-in (anonymous) sale.  |
| `payment_type_id` | integer | FK       | FK → `payment_types.id`. `1` = cash, `2` = credit (utang).          |
| `sale_date`       | string  | required | Timestamp string of when the sale was completed (locale formatted). |

---

### 5.2 `sale_items`

One row per line item in a sale — either a product sale or a bundle sale (never both in the same row).

| Field           | Type    | Nullable | Description                                                                                                            |
| --------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `id`            | integer | required | Primary key.                                                                                                           |
| `sale_id`       | integer | FK       | FK → `sales.id`.                                                                                                       |
| `product_id`    | integer | nullable | FK → `products.id`. Populated for product sales. `null` for bundle sales.                                              |
| `bundle_id`     | integer | nullable | FK → `bundles.id`. Populated for bundle sales. `null` for product sales.                                               |
| `unit_id`       | integer | nullable | FK → `units.id`. The unit the customer bought in (e.g., pc, L, pk). `null` for bundle sales.                           |
| `quantity_sold` | number  | required | How many units were sold.                                                                                              |
| `unit_price`    | number  | required | **Snapshot** of the price per unit at the time of sale. This never changes even if `product_pricing` is later updated. |
| `total_price`   | number  | required | `quantity_sold × unit_price`. Stored for query convenience.                                                            |
| `sale_type`     | string  | required | One of: `retail` (below wholesale threshold), `wholesale` (at or above wholesale threshold), `bundle`.                 |

> 💡 **Mutually exclusive columns:** `product_id` and `bundle_id` are never both populated in the same row. If `bundle_id` is set, `product_id` and `unit_id` are `null`. If `product_id` is set, `bundle_id` is `null`. Always check `sale_type` to determine how to interpret the row.

---

### 5.3 `sale_bundle_items`

When a bundle is sold, this table records exactly which product units were deducted from stock. Think of it as the "exploded" view of a bundle sale.

| Field               | Type    | Nullable | Description                                                                             |
| ------------------- | ------- | -------- | --------------------------------------------------------------------------------------- |
| `id`                | integer | required | Primary key.                                                                            |
| `sale_item_id`      | integer | FK       | FK → `sale_items.id`. The bundle line item this deduction belongs to.                   |
| `bundle_item_id`    | integer | FK       | FK → `bundle_items.id`. Which bundle slot this row corresponds to.                      |
| `product_id`        | integer | FK       | FK → `products.id`. Denormalised for query convenience.                                 |
| `unit_id`           | integer | FK       | FK → `units.id`. Denormalised for query convenience.                                    |
| `quantity_deducted` | number  | required | Total quantity removed from stock = `bundle_items.quantity × sale_items.quantity_sold`. |

---

## 6. Credit (Utang) Domain

"Utang" means credit sale. When a customer cannot pay immediately, a credit transaction is created. Payments are recorded as separate append-only rows. The outstanding balance is always computed from the difference, never stored directly.

### 6.1 `customers`

Stores named customers who can make credit purchases. Walk-in (anonymous) customers are supported by setting `sales.customer_id = null`.

| Field            | Type    | Nullable | Description                                                                                                                 |
| ---------------- | ------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| `id`             | integer | required | Primary key.                                                                                                                |
| `first_name`     | string  | required | Customer's first name.                                                                                                      |
| `middle_name`    | string  | nullable | Optional middle name or initial.                                                                                            |
| `last_name`      | string  | required | Customer's last name.                                                                                                       |
| `contact_number` | string  | nullable | Mobile number (e.g., `09XXXXXXXXX`).                                                                                        |
| `municipality`   | string  | nullable | Municipality for delivery or identification.                                                                                |
| `barangay`       | string  | nullable | Barangay (neighbourhood) for delivery.                                                                                      |
| `street`         | string  | nullable | Street or purok address.                                                                                                    |
| `credit_limit`   | number  | required | Maximum total outstanding balance allowed. The app checks `getCustomerDebt(customer_id)` before allowing a new credit sale. |

---

### 6.2 `payment_types`

A tiny lookup table with just two rows: `cash` (id=1) and `credit` (id=2). Referenced by `sales.payment_type_id`.

| Field  | Type    | Nullable | Description             |
| ------ | ------- | -------- | ----------------------- |
| `id`   | integer | required | Primary key.            |
| `name` | string  | required | `"cash"` or `"credit"`. |

---

### 6.3 `credit_transactions`

One row per credit sale. The `amount_owed` field is fixed at creation time and never updated — it always equals the original sale total.

| Field         | Type    | Nullable | Description                                                                                                            |
| ------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `id`          | integer | required | Primary key.                                                                                                           |
| `customer_id` | integer | FK       | FK → `customers.id`.                                                                                                   |
| `sale_id`     | integer | nullable | FK → `sales.id`. Links this credit record to the originating sale. `null` for manually entered debts with no POS sale. |
| `amount_owed` | number  | required | The original total of the credit sale. **NEVER updated** after creation.                                               |
| `due_date`    | string  | nullable | Expected repayment date (ISO or empty string).                                                                         |
| `created_at`  | string  | required | Date the credit was recorded.                                                                                          |

---

### 6.4 `credit_payments`

Each time a customer makes a repayment, a new row is appended here. The outstanding balance for a `credit_transaction` is: `amount_owed − SUM(credit_payments.amount_paid)`.

| Field                   | Type    | Nullable | Description                                          |
| ----------------------- | ------- | -------- | ---------------------------------------------------- |
| `id`                    | integer | required | Primary key.                                         |
| `credit_transaction_id` | integer | FK       | FK → `credit_transactions.id`.                       |
| `amount_paid`           | number  | required | Amount paid in this installment.                     |
| `paid_at`               | string  | required | ISO date string of payment.                          |
| `notes`                 | string  | nullable | Optional note (e.g., `"Partial — magbabayad ulit"`). |

> 💡 **Computing balance:** Always use `getCreditBalance(ct)` and `getCreditStatus(ct)` helper functions from `data.js`. `getCreditBalance` returns the remaining amount. `getCreditStatus` returns `"unpaid"`, `"partial"`, or `"paid"`. These helpers sum `credit_payments` correctly.

> 💡 **Credit limit check:** Before allowing a new credit sale, call `getCustomerDebt(customer_id)` which sums `getCreditBalance()` across all open `credit_transactions` for that customer. If the sum + the new sale total exceeds `customer.credit_limit`, the checkout is blocked.

---

## 7. Operations Domain

### 7.1 `expense_categories`

Lookup table for categorising store expenses. Pre-seeded with local Cebuano/Filipino category names.

| Field  | Type    | Nullable | Description                                                                                                                                                            |
| ------ | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`   | integer | required | Primary key.                                                                                                                                                           |
| `name` | string  | required | Category label: `Kumpra` (purchases/stock), `Tubig` (water bill), `Kuryente` (electricity), `Transportasyon`, `Mga Bayronon` (other bills), `Uban Pa` (miscellaneous). |

---

### 7.2 `expenses`

Logs money spent by the store — stock purchases, utility bills, transport, etc. Each row is one expense entry.

| Field                 | Type    | Nullable | Description                                                                               |
| --------------------- | ------- | -------- | ----------------------------------------------------------------------------------------- |
| `id`                  | integer | required | Primary key.                                                                              |
| `expense_category_id` | integer | FK       | FK → `expense_categories.id`.                                                             |
| `amount`              | number  | required | Peso amount of the expense.                                                               |
| `notes`               | string  | nullable | Description of what was bought or paid.                                                   |
| `image_url`           | string  | nullable | Path to a receipt photo (not used in demo mode; reserved for future file upload feature). |
| `created_at`          | string  | required | ISO date string of when the expense was recorded.                                         |

> 💡 **Usage in Dashboard:** The Dashboard's net income widget computes: `SUM(sale_items.total_price) − SUM(expenses.amount)`. This gives a rough profit figure for the visible period.

---

## 8. Table Relationships

All foreign key relationships. Read `→` as "references". Every item on the right side is the parent table.

```
products.unit_id                    →  units.id
products.product_category_id        →  product_categories.id
product_pricing.product_id          →  products.id
product_units.product_id            →  products.id
product_units.unit_id               →  units.id
unit_conversions.from_unit_id       →  units.id
unit_conversions.to_unit_id         →  units.id
bundle_items.bundle_id              →  bundles.id
bundle_items.product_id             →  products.id
bundle_items.unit_id                →  units.id
stock_batches.product_id            →  products.id
stock_batches.unit_id               →  units.id
stock_logs.product_id               →  products.id
stock_logs.unit_id                  →  units.id
stock_logs.stock_batch_id           →  stock_batches.id     (nullable)
sales.customer_id                   →  customers.id         (nullable)
sales.payment_type_id               →  payment_types.id
sale_items.sale_id                  →  sales.id
sale_items.product_id               →  products.id          (nullable)
sale_items.bundle_id                →  bundles.id           (nullable)
sale_items.unit_id                  →  units.id             (nullable)
sale_bundle_items.sale_item_id      →  sale_items.id
sale_bundle_items.bundle_item_id    →  bundle_items.id
sale_bundle_items.product_id        →  products.id
sale_bundle_items.unit_id           →  units.id
credit_transactions.customer_id     →  customers.id
credit_transactions.sale_id         →  sales.id             (nullable)
credit_payments.credit_transaction_id → credit_transactions.id
expenses.expense_category_id        →  expense_categories.id
```

---

## 9. Helper Functions (`data.js`)

These functions are defined at the bottom of `data.js` and must be used instead of querying `db` arrays directly. They encapsulate the business logic for the most common lookups.

### 9.1 Pricing Helpers

| Function                                     | What it does                                                                                                                                         |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getProductPricing(product_id)`              | Returns the latest `product_pricing` row for a product. Use this for displaying current price or computing cart totals.                              |
| `getProductPricingAt(product_id, dateStr)`   | Returns the `product_pricing` row that was active on a given ISO date. Use this when replaying historical sale data.                                 |
| `getProductUnitOptions(product_id)`          | Returns all `product_units` rows for a product. Returns an empty array if the product has only its base unit.                                        |
| `getProductUnitPricing(product_id, unit_id)` | Returns the `product_units` row for a specific product + unit combination, or `null` if not found. Used during checkout to resolve per-unit pricing. |

### 9.2 Credit Helpers

| Function                       | What it does                                                                                                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getCreditBalance(ct)`         | Accepts a `credit_transaction` object. Returns the outstanding balance: `amount_owed` minus the sum of all `credit_payments` for that transaction. |
| `getCreditStatus(ct)`          | Returns `"unpaid"` (no payments at all), `"partial"` (some paid, not all), or `"paid"` (fully paid). Use this to drive badge colours and UI state. |
| `getCustomerDebt(customer_id)` | Returns the total outstanding balance across **all** `credit_transactions` for a customer. Used in the credit limit check at checkout.             |

### 9.3 Other Helpers

| Function                          | What it does                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `getProductCategory(product)`     | Accepts a product object. Returns the category name string by looking up `product_categories`.                                       |
| `getBundleItems(bundle_id)`       | Returns all `bundle_items` rows for a given bundle.                                                                                  |
| `getBundleRetailTotal(bundle_id)` | Sums the retail prices of all products in a bundle (at current pricing). Used to calculate the savings displayed in the bundle card. |
| `genId(type)`                     | Increments and returns the next available ID for a given table key. Always use this instead of manually computing IDs.               |

---

## 10. Common Workflows

Step-by-step walkthroughs of the most important data flows in the app.

### 10.1 Processing a Sale (Checkout)

1. The cashier clicks ✅ **Bayad Na** in the POS.
2. The app calls `checkout()` in `script.js`.
3. A new row is inserted into `sales` with `customer_id` (null if walk-in), `payment_type_id`, and `sale_date`.
4. For each product in `cart`: resolve price via `getProductUnitPricing()` or `getProductPricingAt()`, insert a `sale_items` row with snapshotted `unit_price` and `total_price`, decrement `products.stock_quantity`, and write a `stock_logs` row with `reason = "sold"`.
5. For each bundle in `cartBundles`: insert one `sale_items` row with `bundle_id` set. Then for each `bundle_items` row, insert a `sale_bundle_items` row, decrement `products.stock_quantity`, and write a `stock_logs` row.
6. If `payment_type_id = 2` (credit), insert a `credit_transactions` row with `amount_owed = total`.
7. Show the receipt modal.

---

### 10.2 Recording a Credit Payment

1. The cashier clicks 💰 **Bayad** on a credit card in the Utang page.
2. A new row is inserted into `credit_payments` with `credit_transaction_id`, `amount_paid`, and `paid_at`.
3. The balance is recalculated: `getCreditBalance(ct)` subtracts all `credit_payments` from `amount_owed`. No fields are ever updated — all balance logic is computed on the fly.

---

### 10.3 Adding or Editing a Product

1. The manager opens the product modal and fills in name, category, stock, pricing, and optional unit rows.
2. On save, `saveProduct()` is called.
3. If **editing**: update the `products` row in place. If prices changed, append a **new** `product_pricing` row with today's `effective_date` — never update the old row.
4. The `product_units` rows for this product are replaced wholesale: all old rows with matching `product_id` are removed, and the new set from `pendingProductUnits` is inserted.
5. If **creating new**: insert a `products` row, one `product_pricing` row, and any `product_units` rows.

---

### 10.4 Logging a Stock Change

1. The manager opens the Stock Logs page and clicks **＋ Log Stock Change**.
2. They pick a product, enter a `change_qty` (positive to add, negative to remove), a reason, and optional notes.
3. On save, a `stock_logs` row is inserted. For restocks, a `stock_batches` row is also inserted with the expiry date.
4. `products.stock_quantity` is updated by `change_qty`.

---

## 11. Quick Reference

### 11.1 All Tables at a Glance

| Table                 | Domain        | Purpose                                                   |
| --------------------- | ------------- | --------------------------------------------------------- |
| `product_categories`  | 🟣 Catalog    | Lookup table for product grouping (Candy, Drinks, etc.)   |
| `units`               | 🟣 Catalog    | Lookup for units of measurement (pc, L, kg, etc.)         |
| `unit_conversions`    | 🟣 Catalog    | Conversion factors between compatible units               |
| `products`            | 🟣 Catalog    | Master product list — identity and live stock count       |
| `product_pricing`     | 🟣 Catalog    | Append-only price history per product                     |
| `product_units`       | 🟣 Catalog    | Alternative selling units with their own per-unit pricing |
| `bundles`             | 🟣 Catalog    | Bundle deal headers — name and total bundle price         |
| `bundle_items`        | 🟣 Catalog    | Products included in each bundle and their quantities     |
| `stock_batches`       | 🟢 Inventory  | Inbound deliveries with expiry dates                      |
| `stock_logs`          | 🟢 Inventory  | Full audit trail of every stock movement                  |
| `payment_types`       | 🔴 Credit     | Lookup: cash or credit                                    |
| `customers`           | 🔴 Credit     | Named customers who can hold credit balances              |
| `sales`               | 🟠 Sales      | Transaction header — one row per checkout                 |
| `sale_items`          | 🟠 Sales      | Line items — one row per product or bundle per sale       |
| `sale_bundle_items`   | 🟠 Sales      | Individual product deductions from bundle sales           |
| `credit_transactions` | 🔴 Credit     | Credit sale records — fixed `amount_owed` per sale        |
| `credit_payments`     | 🔴 Credit     | Append-only repayment installments                        |
| `expense_categories`  | 🔵 Operations | Lookup table for expense types                            |
| `expenses`            | 🔵 Operations | Store expense records (stock purchases, bills, etc.)      |

### 11.2 Column Nullability Legend

| Label      | Meaning                                                     |
| ---------- | ----------------------------------------------------------- |
| `required` | Must have a value — cannot be null or omitted               |
| `nullable` | Can be null or an empty string                              |
| `FK`       | Foreign key — must reference a valid ID in the parent table |

---

> 📝 **A note on demo mode:** In demo mode (default), all data lives in the browser's memory and resets on page reload. To persist data, export `db` to `localStorage` or connect to a real database. The schema is designed to be directly portable to any relational database — each `db` array maps 1:1 to a SQL table, and all FK relationships map to SQL `FOREIGN KEY` constraints.
