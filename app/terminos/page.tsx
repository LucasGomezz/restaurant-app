import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Owner, Section } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Términos y condiciones — ${LEGAL.productName}`,
};

export default function TerminosPage() {
  return (
    <LegalPage title="Términos y condiciones">
      <p>
        Estos términos regulan el uso de {LEGAL.productName}, prestado por{" "}
        <Owner />. Al crear una cuenta los aceptás, junto con nuestra{" "}
        <Link href="/privacidad" className="link">
          Política de privacidad
        </Link>
        .
      </p>

      <Section title="1. El servicio">
        <p>
          {LEGAL.productName} te permite guardar lugares en un mapa, registrar
          visitas con fotos y compartirlos con otras personas mediante
          carpetas. Durante la beta el servicio es gratuito, puede cambiar,
          tener errores o interrupciones, y algunas funciones pueden agregarse
          o quitarse. Si en el futuro hay planes pagos, sus condiciones se
          informarán antes de cobrar nada.
        </p>
      </Section>

      <Section title="2. Tu cuenta">
        <p>
          Sos responsable de mantener tu contraseña segura y de lo que se haga
          con tu cuenta. Tenés que dar un email válido y no podés hacerte pasar
          por otra persona. Podés eliminar tu cuenta cuando quieras desde{" "}
          <Link href="/cuenta" className="link">
            Mi cuenta
          </Link>
          .
        </p>
      </Section>

      <Section title="3. Tu contenido">
        <p>
          Lo que cargás (lugares, textos, fotos) sigue siendo tuyo. Nos das
          permiso para guardarlo, procesarlo y mostrarlo a vos y a quienes vos
          elijas, solo para prestar el servicio. Ese permiso termina cuando lo
          borrás o eliminás tu cuenta.
        </p>
        <p>
          Sos responsable de tener derecho a subir lo que subís. En particular:
          no subas fotos de otras personas sin su consentimiento, contenido
          ilegal, ofensivo o que viole derechos de terceros. Podemos quitar
          contenido que incumpla estos términos.
        </p>
      </Section>

      <Section title="4. Compartir">
        <p>
          Cuando sumás un lugar a una carpeta, sus miembros pueden verlo y, si
          tienen permiso de edición, modificar sus datos, visitas y fotos.
          Elegí bien con quién compartís: no podemos controlar lo que otros
          hagan con lo que ven.
        </p>
      </Section>

      <Section title="5. Uso aceptable">
        <p>
          No uses el servicio para acosar a otras personas, enviar spam,
          intentar acceder a datos de otros usuarios, sobrecargar o vulnerar el
          sistema, ni para fines ilegales. Podemos suspender o cerrar cuentas
          que lo hagan.
        </p>
      </Section>

      <Section title="6. Responsabilidad">
        <p>
          El servicio se ofrece “tal como está”. Hacemos lo posible para que
          funcione bien y para cuidar tus datos, pero no garantizamos que esté
          libre de errores ni disponible siempre. Te recomendamos conservar
          copias de las fotos que te importen. En la medida que la ley lo
          permita, no somos responsables por daños indirectos derivados del uso
          del servicio. Nada de esto limita los derechos que te da la ley de
          defensa del consumidor.
        </p>
      </Section>

      <Section title="7. Cambios y ley aplicable">
        <p>
          Podemos actualizar estos términos; si el cambio es importante te
          avisaremos antes. Se rigen por las leyes de {LEGAL.country}. Para
          cualquier consulta, escribinos a <Owner />.
        </p>
      </Section>
    </LegalPage>
  );
}
