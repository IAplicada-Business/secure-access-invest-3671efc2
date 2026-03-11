

# Cadastrar usuário como admin

O usuário `contato@juliedemattos.com.br` já existe no banco de dados (ID: `d27cec67-f764-45ee-97e2-32ad59ef0fef`) mas ainda não possui nenhum role atribuido.

## Alteracao

Inserir na tabela `user_roles` o registro vinculando esse usuário ao role `admin`:

```sql
INSERT INTO user_roles (user_id, role) 
VALUES ('d27cec67-f764-45ee-97e2-32ad59ef0fef', 'admin');
```

Nenhuma alteracao de codigo necessaria.

