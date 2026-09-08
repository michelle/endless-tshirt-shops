import type { Product, IconType } from "./products";

// All badge art is built from plain divs (circles, rotated rects, clip-path
// polygons) so it can be rendered by Satori (@vercel/og) into a transparent
// PNG that works both as the on-site product photo and as Prodigi print
// artwork. Coordinates are percentages of the enclosing box, so the whole
// thing scales cleanly to any output size.

function Dot(props: {
  left: string;
  top: string;
  size: string;
  color: string;
  rotate?: string;
  radius?: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: props.left,
        top: props.top,
        width: props.size,
        height: props.size,
        background: props.color,
        borderRadius: props.radius ?? "50%",
        transform: `rotate(${props.rotate ?? "0deg"})`,
        display: "flex",
      }}
    />
  );
}

function Poly(props: {
  left: string;
  top: string;
  width: string;
  height: string;
  color: string;
  points: string; // clip-path polygon points
  rotate?: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: props.left,
        top: props.top,
        width: props.width,
        height: props.height,
        background: props.color,
        clipPath: `polygon(${props.points})`,
        transform: `rotate(${props.rotate ?? "0deg"})`,
        display: "flex",
      }}
    />
  );
}

function CreatureIcon({
  icon,
  color,
  accent,
}: {
  icon: IconType;
  color: string;
  accent: string;
}) {
  // NOTE: children are passed as a flat array (not JSX children / Fragments)
  // and rendered directly inside the position:relative stage below. Satori
  // resolves percentage left/top/width/height on an absolutely-positioned
  // node against its *immediate* parent box, so any extra in-between div
  // without explicit dimensions collapses to 0x0 and silently hides
  // everything inside it. Keeping the stage as the one and only ancestor of
  // every absolutely-positioned shape avoids that trap.
  let shapes: React.ReactNode[];

  switch (icon) {
    case "bigfoot":
      shapes = [
        <Dot
          key="sole"
          left="17%"
          top="30%"
          size="66%"
          color={color}
          radius="46% 46% 40% 40% / 60% 60% 38% 38%"
        />,
        <Dot key="t1" left="16%" top="6%" size="20%" color={color} />,
        <Dot key="t2" left="34%" top="0%" size="22%" color={color} />,
        <Dot key="t3" left="55%" top="0%" size="22%" color={color} />,
        <Dot key="t4" left="75%" top="6%" size="19%" color={color} />,
        <Dot key="t5" left="88%" top="16%" size="15%" color={color} />,
      ];
      break;
    case "nessie":
      shapes = [
        <div
          key="water"
          style={{
            position: "absolute",
            left: "0%",
            top: "66%",
            width: "100%",
            height: "8%",
            background: accent,
            borderRadius: "999px",
            display: "flex",
          }}
        />,
        <Dot key="h1" left="8%" top="52%" size="24%" color={color} radius="50% 50% 0 0" />,
        <Dot key="h2" left="32%" top="42%" size="30%" color={color} radius="50% 50% 0 0" />,
        <Dot key="h3" left="60%" top="50%" size="22%" color={color} radius="50% 50% 0 0" />,
        <div
          key="neck"
          style={{
            position: "absolute",
            left: "68%",
            top: "10%",
            width: "16%",
            height: "46%",
            background: color,
            borderRadius: "999px",
            transform: "rotate(18deg)",
            display: "flex",
          }}
        />,
        <Dot key="head" left="76%" top="4%" size="20%" color={color} />,
        <Dot key="eye" left="88%" top="10%" size="4.5%" color={accent} />,
      ];
      break;
    case "chupacabra":
      shapes = [
        <Poly key="s1" left="20%" top="0%" width="14%" height="20%" color={accent} points="50% 0%, 100% 100%, 0% 100%" rotate="-6deg" />,
        <Poly key="s2" left="38%" top="-6%" width="14%" height="22%" color={accent} points="50% 0%, 100% 100%, 0% 100%" />,
        <Poly key="s3" left="56%" top="0%" width="14%" height="20%" color={accent} points="50% 0%, 100% 100%, 0% 100%" rotate="6deg" />,
        <Poly key="earL" left="10%" top="14%" width="22%" height="30%" color={color} points="100% 0%, 100% 100%, 0% 100%" rotate="-8deg" />,
        <Poly key="earR" left="68%" top="14%" width="22%" height="30%" color={color} points="0% 0%, 100% 100%, 0% 100%" rotate="8deg" />,
        <Dot key="head" left="18%" top="26%" size="64%" color={color} radius="48% 48% 50% 50% / 55% 55% 45% 45%" />,
        <Dot key="eyeL" left="34%" top="50%" size="12%" color={accent} />,
        <Dot key="eyeR" left="56%" top="50%" size="12%" color={accent} />,
      ];
      break;
    case "mothman":
      shapes = [
        <Poly
          key="wingL"
          left="-8%"
          top="10%"
          width="55%"
          height="80%"
          color={color}
          points="100% 8%, 30% 0%, 0% 55%, 35% 100%, 100% 70%"
          rotate="-4deg"
        />,
        <Poly
          key="wingR"
          left="53%"
          top="10%"
          width="55%"
          height="80%"
          color={color}
          points="0% 8%, 70% 0%, 100% 55%, 65% 100%, 0% 70%"
          rotate="4deg"
        />,
        <Dot key="body" left="38%" top="22%" size="24%" color={color} radius="45% 45% 50% 50% / 55% 55% 45% 45%" />,
        <div key="antL" style={{ position: "absolute", left: "42%", top: "2%", width: "5%", height: "20%", background: color, borderRadius: "999px", transform: "rotate(-20deg)", display: "flex" }} />,
        <div key="antR" style={{ position: "absolute", left: "53%", top: "2%", width: "5%", height: "20%", background: color, borderRadius: "999px", transform: "rotate(20deg)", display: "flex" }} />,
        <Dot key="eyeL" left="41%" top="28%" size="9%" color={accent} />,
        <Dot key="eyeR" left="55%" top="28%" size="9%" color={accent} />,
      ];
      break;
    case "jackalope":
      shapes = [
        <div key="antlerM" style={{ position: "absolute", left: "44%", top: "-6%", width: "5%", height: "34%", background: accent, borderRadius: "999px", transform: "rotate(-6deg)", display: "flex" }} />,
        <div key="antlerL" style={{ position: "absolute", left: "26%", top: "-2%", width: "4%", height: "18%", background: accent, borderRadius: "999px", transform: "rotate(-42deg)", display: "flex" }} />,
        <div key="antlerR" style={{ position: "absolute", left: "68%", top: "-2%", width: "4%", height: "18%", background: accent, borderRadius: "999px", transform: "rotate(42deg)", display: "flex" }} />,
        <div key="earL" style={{ position: "absolute", left: "24%", top: "6%", width: "16%", height: "48%", background: color, borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%", transform: "rotate(-14deg)", display: "flex" }} />,
        <div key="earR" style={{ position: "absolute", left: "60%", top: "6%", width: "16%", height: "48%", background: color, borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%", transform: "rotate(14deg)", display: "flex" }} />,
        <Dot key="head" left="22%" top="38%" size="56%" color={color} />,
        <Dot key="eye" left="42%" top="58%" size="9%" color={accent} />,
        <Dot key="nose" left="46%" top="76%" size="7%" color={accent} />,
      ];
      break;
    case "yeti":
      shapes = [
        <Poly key="mtn1" left="-4%" top="55%" width="60%" height="45%" color={accent} points="0% 100%, 60% 0%, 100% 100%" />,
        <Poly key="mtn2" left="44%" top="45%" width="66%" height="55%" color={accent} points="0% 100%, 55% 0%, 100% 100%" />,
        <Dot key="head" left="14%" top="6%" size="72%" color={color} />,
        <Dot key="eyeL" left="36%" top="38%" size="9%" color="#20303a" />,
        <Dot key="eyeR" left="58%" top="38%" size="9%" color="#20303a" />,
        <div
          key="smile"
          style={{
            position: "absolute",
            left: "38%",
            top: "56%",
            width: "24%",
            height: "10%",
            borderBottom: "6px solid #20303a",
            borderRadius: "0 0 50% 50%",
            display: "flex",
          }}
        />,
      ];
      break;
    default:
      shapes = [];
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
      }}
    >
      {shapes}
    </div>
  );
}

export function BadgeArt({
  product,
  width,
  height,
}: {
  product: Product;
  width: number;
  height: number;
}) {
  const badge = Math.round(Math.min(width, height * 0.72) * 0.86);
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: Math.round(height * 0.1),
      }}
    >
      <div
        style={{
          position: "relative",
          width: badge,
          height: badge,
          display: "flex",
        }}
      >
        {/* concentric rings */}
        <Dot left="0%" top="0%" size="100%" color={product.ringColor} />
        <Dot left="4%" top="4%" size="92%" color={product.bgColor} />
        <Dot left="7.5%" top="7.5%" size="85%" color={product.accentColor} />
        <Dot left="9.5%" top="9.5%" size="81%" color={product.bgColor} />

        {/* content inside inner face */}
        <div
          style={{
            position: "absolute",
            left: "9.5%",
            top: "9.5%",
            width: "81%",
            height: "81%",
            borderRadius: "50%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingTop: "9%",
          }}
        >
          <div
            style={{
              fontFamily: "Oswald",
              fontWeight: 700,
              fontSize: Math.round(badge * 0.026),
              letterSpacing: 1.5,
              color: product.ringColor,
              display: "flex",
            }}
          >
            BUREAU OF ORDINARY MONSTERS
          </div>
          <div
            style={{
              fontFamily: "ArchivoBlack",
              fontSize: Math.round(
                badge * (product.name.length >= 10 ? 0.09 : product.name.length >= 8 ? 0.105 : 0.135)
              ),
              color: product.ringColor,
              letterSpacing: 2,
              marginTop: Math.round(badge * 0.02),
              display: "flex",
            }}
          >
            {product.name}
          </div>

          <div
            style={{
              position: "relative",
              width: "46%",
              height: "34%",
              marginTop: Math.round(badge * 0.03),
              display: "flex",
            }}
          >
            <CreatureIcon
              icon={product.icon}
              color={product.silhouetteColor}
              accent={product.accentColor}
            />
          </div>

          <div
            style={{
              fontFamily: "Oswald",
              fontWeight: 400,
              fontSize: Math.round(badge * 0.026),
              letterSpacing: 2,
              color: product.ringColor,
              marginTop: Math.round(badge * 0.045),
              display: "flex",
            }}
          >
            {product.established} - {product.fileNo}
          </div>
        </div>

        {/* ribbon */}
        <div
          style={{
            position: "absolute",
            left: "-6%",
            top: "78%",
            width: "112%",
            height: Math.round(badge * 0.16),
            background: product.ringColor,
            transform: "rotate(-3deg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 6px 0 rgba(0,0,0,0.15)",
          }}
        >
          <div
            style={{
              fontFamily: "Oswald",
              fontWeight: 700,
              fontSize: Math.round(badge * 0.044),
              letterSpacing: 2,
              color: product.bgColor,
              display: "flex",
            }}
          >
            {product.role}
          </div>
        </div>
      </div>

      <div
        style={{
          fontFamily: "Oswald",
          fontWeight: 400,
          fontSize: Math.round(width * 0.028),
          letterSpacing: 2,
          color: "#5b5348",
          marginTop: Math.round(height * 0.06),
          display: "flex",
        }}
      >
        {product.dept}
      </div>
    </div>
  );
}
