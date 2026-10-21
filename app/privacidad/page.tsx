import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Owner, Section } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Política de privacidad — ${LEGAL.productName}`,
};

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de privacidad">
      <p>
        En {LEGAL.productName} guardás lugares, fotos y recuerdos personales.
        Esta política explica qué datos tratamos, para qué, con quién se
        comparten y cómo podés ejercer tus derechos.
      </p>

      <Section title="1. Responsable">
        <p>
          El responsable del tratamiento de tus datos es <Owner />, con
          domicilio en {LEGAL.country}.
        </p>
      </Section>

      <Section title="2. Qué datos tratamos">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Cuenta:</strong> tu email y tu contraseña (que guarda
            nuestro proveedor de autenticación de forma cifrada; nosotros no
            podemos verla).
          </li>
          <li>
            <strong>Perfil:</strong> tu nombre y tu nombre de usuario, visibles
            para quienes compartan carpetas o amistad con vos.
          </li>
          <li>
            <strong>Contenido que cargás:</strong> lugares, ubicaciones,
            direcciones, notas, fechas, visitas, platos y fotos.
          </li>
          <li>
            <strong>Relaciones:</strong> tus amigos y las carpetas de las que
            sos miembro, con tu rol en cada una.
          </li>
          <li>
            <strong>Búsquedas de direcciones:</strong> el texto que buscás, que
            se envía a un proveedor de geolocalización.
          </li>
          <li>
            <strong>Datos técnicos:</strong> cookies esenciales (sesión y
            preferencias como el menú plegado) y los registros técnicos
            (dirección IP, navegador) que guardan nuestros proveedores de
            infraestructura.
          </li>
        </ul>
      </Section>

      <Section title="3. Para qué los usamos">
        <p>
          Únicamente para prestarte el servicio: guardar tu contenido,
          mostrártelo, compartirlo con quien vos elijas y mantener la seguridad
          de tu cuenta. <strong>No vendemos tus datos, no mostramos publicidad
          y no los usamos para perfilarte.</strong> Si en el futuro agregamos
          planes pagos, el procesador de pagos tratará los datos de cobro según
          su propia política.
        </p>
      </Section>

      <Section title="4. Quién puede ver tu contenido">
        <p>
          Lo que cargás es privado por defecto: lo ves solo vos. Los demás
          usuarios ven únicamente los lugares que vos sumás a una carpeta
          compartida, mientras sean miembros de esa carpeta. Ser amigos no da
          acceso a tus lugares. Los miembros de una carpeta pueden guardar
          copias de lo que ven (por ejemplo, capturas de pantalla), por lo que
          te pedimos compartir solo lo que quieras compartir.
        </p>
      </Section>

      <Section title="5. Proveedores que tratan datos por nosotros">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Supabase</strong>: base de datos, autenticación y
            almacenamiento de fotos.
          </li>
          <li>
            <strong>Vercel</strong>: alojamiento de la aplicación.
          </li>
          <li>
            <strong>OpenFreeMap</strong>: imágenes del mapa (recibe tu IP al
            cargar el mapa, no tu contenido).
          </li>
          <li>
            <strong>OpenStreetMap Nominatim</strong> o <strong>Geoapify</strong>
            : búsqueda de direcciones (recibe el texto buscado).
          </li>
          <li>
            El proveedor de envío de emails que usemos para confirmaciones y
            recuperación de contraseña.
          </li>
        </ul>
        <p>
          Algunos de estos proveedores tienen servidores fuera de{" "}
          {LEGAL.country} (por ejemplo, en Estados Unidos). Solo trabajamos con
          proveedores que ofrecen garantías adecuadas de protección.
        </p>
      </Section>

      <Section title="6. Cuánto tiempo los guardamos">
        <p>
          Mientras tu cuenta exista. Podés borrar lugares, fotos y visitas en
          cualquier momento, y eliminar tu cuenta desde{" "}
          <Link href="/cuenta" className="link">
            Mi cuenta
          </Link>
          : se borran tu perfil, tus lugares con sus visitas y fotos, tus
          tipos, tus amistades y las carpetas de las que sos dueño. Las copias
          de seguridad de nuestros proveedores pueden conservar datos por un
          tiempo limitado antes de eliminarse.
        </p>
      </Section>

      <Section title="7. Tus derechos">
        <p>
          Podés acceder, rectificar, actualizar y suprimir tus datos. La
          mayoría lo podés hacer desde la aplicación; para todo lo demás,
          escribinos a <Owner />.
        </p>
        <p className="rounded-xl bg-stone-100 px-4 py-3 text-sm text-stone-600">
          El titular de los datos personales tiene la facultad de ejercer el
          derecho de acceso a los mismos en forma gratuita a intervalos no
          inferiores a seis meses, salvo que se acredite un interés legítimo al
          efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley
          Nº 25.326. La Agencia de Acceso a la Información Pública, en su
          carácter de Órgano de Control de la Ley Nº 25.326, tiene la
          atribución de atender las denuncias y reclamos que interpongan
          quienes resulten afectados en sus derechos por incumplimiento de las
          normas vigentes en materia de protección de datos personales.
        </p>
      </Section>

      <Section title="8. Cookies">
        <p>
          Usamos solo cookies esenciales: la de tu sesión y la que recuerda si
          plegaste el menú. No usamos cookies de publicidad ni de analítica de
          terceros.
        </p>
      </Section>

      <Section title="9. Menores">
        <p>
          El servicio está pensado para mayores de 13 años. Si sos menor de 18,
          usalo con el consentimiento de tus padres o tutores.
        </p>
      </Section>

      <Section title="10. Cambios">
        <p>
          Si cambiamos esta política de forma importante, te lo vamos a avisar
          en la aplicación o por email antes de que el cambio aplique.
        </p>
      </Section>
    </LegalPage>
  );
}
