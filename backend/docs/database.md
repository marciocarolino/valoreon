# 📊 Database - Valoreon

## 👤 Users

| Campo    | Tipo    | Coluna DB | Descrição                      |
| -------- | ------- | --------- | ------------------------------ |
| id       | Long    | id        | Identificador único do usuário |
| publicId | UUID    | public_id | Identificador público (UUID)   |
| name     | String  | name      | Nome do usuário                |
| email    | String  | email     | Email único do usuário         |
| status   | boolean | status    | Status ativo/inativo           |
| password | String  | password  | Senha criptografada            |

---

## 🏢 Companies

| Campo          | Tipo          | Coluna DB       | Descrição                               |
| -------------- | ------------- | --------------- | --------------------------------------- |
| id             | Long          | id              | Identificador único da empresa          |
| name           | String        | name            | Nome da empresa                         |
| sector         | String        | sector          | Setor de atuação                        |
| monthlyRevenue | BigDecimal    | monthly_revenue | Receita mensal (bruta)                  |
| monthlyProfit  | BigDecimal    | monthly_profit  | Lucro mensal                            |
| growthRate     | Double        | growth_rate     | Taxa de crescimento (ex: 0.10 = 10%)    |
| createdAt      | LocalDateTime | created_at      | Data de criação do registro             |
| user           | User          | user_id         | Usuário dono da empresa (FK → users.id) |

---

## 🔗 Relacionamentos

### User → Company

* Tipo: **OneToMany**
* Um usuário pode ter várias empresas

### Company → User

* Tipo: **ManyToOne**
* Cada empresa pertence a um único usuário

---

## 📌 Observações

* Valores monetários usam **BigDecimal (precision=15, scale=2)**
* `growthRate` deve seguir padrão decimal:

  * `0.10 = 10%`
* `createdAt` é gerado automaticamente via `@PrePersist`
* `publicId` é gerado automaticamente (UUID)

---
