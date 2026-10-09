# Panel /admin: crear el primer administrador

El registro público está **desactivado** y el panel no puede crear administradores. Un administrador
es un usuario de Supabase Auth que además tiene una fila en `public.admin_users`. Esa fila solo se
puede crear desde el panel de Supabase (nunca desde la aplicación), así nadie puede autoasignarse el rol.

## Pasos (una sola vez, en el Dashboard de Supabase del proyecto `electro-bodegon`)

1. **Crear el usuario**
   *Authentication → Users → Add user → Create new user*
   - Email: el correo del dueño.
   - Password: una contraseña larga y única (no la compartas por chat ni la guardes en el repositorio).
   - Marca **Auto Confirm User**.
   (También sirve *Invite user*: el usuario fija su contraseña desde el correo.)

2. **Darle el rol de administrador**
   *SQL Editor → New query* y ejecuta (cambia el correo):

   ```sql
   insert into public.admin_users (user_id, role)
   select id, 'owner' from auth.users where email = 'correo-del-dueno@ejemplo.com';
   ```

   Roles válidos: `owner`, `admin`, `editor` (hoy los tres tienen los mismos permisos de escritura).

3. **Comprobar**

   ```sql
   select u.email, a.role from public.admin_users a join auth.users u on u.id = a.user_id;
   ```

4. Entrar en `/admin/login` con ese correo y contraseña.

## Añadir o quitar administradores más adelante

- Añadir: repetir los pasos 1 y 2.
- Quitar acceso: `delete from public.admin_users where user_id = '<uuid>';`
- No hay forma de hacerlo desde el frontend, por diseño.

## Qué protege cada capa

- **RLS (Supabase)** es la autorización real: solo `private.is_admin()` puede escribir en
  productos, imágenes, marcas y categorías, y subir archivos a `catalog-media`.
- Los *guards* de Angular solo evitan mostrar pantallas a quien no corresponde.
- El frontend usa únicamente la clave **publicable**. No hay `service_role` ni `sb_secret_`.
