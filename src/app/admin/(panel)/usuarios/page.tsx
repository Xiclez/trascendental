import { removeStaff, toggleStaff } from "@/app/admin/actions";
import { ResetPasswordForm, StaffForm } from "@/app/admin/forms";
import { fmtDate } from "@/app/admin/orders-table";
import { requireAdmin } from "@/lib/server/admin-auth";
import { listStaff } from "@/lib/server/staff";

const roleText = { admin: "Admin · acceso total", scanner: "Escáner" } as const;

export default async function AdminUsers() {
  await requireAdmin();
  const users = await listStaff();

  return (
    <>
      <h1 className="display ink-worn text-[clamp(2.4rem,6vw,4rem)] text-ink">Usuarios</h1>
      <p className="mt-3 max-w-2xl text-sm text-graphite">
        Cuentas para el personal de acceso. El rol <strong className="text-ink">Escáner</strong> solo puede abrir{" "}
        <code className="text-ink">/scan</code> y registrar ingresos: no ve ventas, órdenes ni datos de compradores. Para entrar
        usan su usuario y contraseña en <code className="text-ink">/admin/login</code>. Tú entras con el usuario{" "}
        <code className="text-ink">admin</code> y la contraseña maestra.
      </p>

      <h2 className="label mt-10 text-[11px] text-ink">Nuevo usuario</h2>
      <div className="mt-4">
        <StaffForm />
      </div>

      <h2 className="label mt-12 text-[11px] text-ink">Cuentas ({users.length})</h2>
      {users.length === 0 ? (
        <p className="mt-4 text-sm text-graphite">Aún no hay usuarios.</p>
      ) : (
        <div className="mt-4 overflow-x-auto border border-rule bg-card/60">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="label border-b border-rule text-[10px] text-graphite">
                <th className="p-3 font-normal">Nombre</th>
                <th className="p-3 font-normal">Usuario</th>
                <th className="p-3 font-normal">Rol</th>
                <th className="p-3 font-normal">Último acceso</th>
                <th className="p-3 font-normal">Contraseña</th>
                <th className="p-3 font-normal">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {users.map((u) => (
                <tr key={u.id} className={u.active ? "" : "text-graphite"}>
                  <td className="p-3 text-ink">{u.name}</td>
                  <td className="p-3 font-mono text-xs">{u.username}</td>
                  <td className="p-3">{roleText[u.role]}</td>
                  <td className="p-3 text-xs">{u.last_login_at ? fmtDate(u.last_login_at) : "—"}</td>
                  <td className="p-3">
                    <ResetPasswordForm id={u.id} />
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <form action={toggleStaff}>
                        <input type="hidden" name="id" value={u.id} />
                        <button type="submit" className="label inline-flex min-h-11 items-center border border-rule px-3 text-[10px] text-ink hover:border-ink">
                          {u.active ? "Desactivar" : "Activar"}
                        </button>
                      </form>
                      <form action={removeStaff}>
                        <input type="hidden" name="id" value={u.id} />
                        <button type="submit" className="label inline-flex min-h-11 items-center px-3 text-[10px] text-graphite hover:text-ink">
                          Eliminar
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
