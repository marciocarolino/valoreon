# Valoreon API

Backend Spring Boot (REST, JWT, JPA, PostgreSQL, Flyway).

## Banco de dados e Flyway

1. **Não alterar o banco manualmente** em produção para mudanças de schema. Toda evolução deve ser feita com **novas migrações** em `src/main/resources/db/migration/` (`V7__...`, `V8__...`, etc.).

2. **Não editar migrações já aplicadas** em ambientes onde o Flyway já as executou. Correções incrementais = novo arquivo com versão maior.

3. **Banco novo (vazio):** ao subir a aplicação, o Flyway aplica as migrações em ordem (`V0` → `V6` e seguintes), depois o Hibernate valida o schema (`spring.jpa.hibernate.ddl-auto=validate`).

4. **Banco já existente (antes do Flyway ou com histórico divergente):** é necessário **alinhar** o histórico do Flyway (`flyway_schema_history`) com o estado real do banco (por exemplo baseline ou reparo documentado pela equipe). Sem isso, o Flyway pode recusar aplicar ou tentar reaplicar scripts.

5. **Não usar** `spring.jpa.hibernate.ddl-auto=create` em produção (apaga/recria dados conforme configuração).

6. **`spring.flyway.baseline-on-migrate`** não está habilitado no projeto por padrão; evite depender de baseline automático sem política clara por ambiente.

---

## Requisitos

- JDK **17** ou superior (o projeto está configurado para **17** no `pom.xml`; pode ajustar para **21** se todo o ambiente suportar).

## Build

```bash
./mvnw.cmd clean verify
```

(Windows: `mvnw.cmd`; Linux/macOS: `./mvnw`.)
