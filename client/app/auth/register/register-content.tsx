"use client";

import { type FormEvent, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  IconChevronLeft,
  IconEye,
  IconEyeOff,
  IconSunsetFilled,
  IconUser,
} from "@tabler/icons-react";
import { useToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { useRegister } from "@/features/auth/hooks";
import { registerSchema } from "@/features/auth/schema";
import type { ApiError } from "@/features/auth/types";
import { useAuthStore } from "@/stores/auth-store";

export default function RegisterPage() {
  const accessToken = useAuthStore((s) => s.accessToken);

  // If already logged in, redirect
  const router = useRouter();
  useEffect(() => {
    if (accessToken) router.push("/dashboard");
  }, [accessToken, router]);

  return <InsetRegisterShowcasePage />;
}

/* ---------- UI ---------- */

function InsetRegisterShowcasePage() {
  return (
    <div className="relative min-h-svh bg-background text-foreground">
      <PageBackdrop />
      <div className="relative mx-auto flex min-h-svh max-w-[1440px] items-stretch p-4 md:p-10 lg:p-16">
        <div className="relative grid w-full grid-cols-1 overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-foreground/10 lg:grid-cols-[1fr_minmax(440px,560px)]">
          <LeftPanel />
          <RightPanel />
        </div>
      </div>
    </div>
  );
}

function PageBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        background: [
          "radial-gradient(60% 50% at 10% 10%, color-mix(in srgb, var(--primary) 10%, transparent), transparent 65%)",
          "radial-gradient(50% 50% at 90% 100%, color-mix(in srgb, var(--foreground) 6%, transparent), transparent 65%)",
        ].join(", "),
      }}
    />
  );
}

type Palette = {
  name: string;
  colors: [
    [number, number, number],
    [number, number, number],
    [number, number, number],
    [number, number, number],
  ];
};

const PALETTES: Palette[] = [
  { name: "Slate", colors: [[0.04, 0.04, 0.07], [0.13, 0.13, 0.17], [0.22, 0.22, 0.30], [0.06, 0.06, 0.10]] },
  { name: "Aurora", colors: [[0.05, 0.08, 0.16], [0.10, 0.32, 0.48], [0.42, 0.20, 0.58], [0.06, 0.10, 0.18]] },
  { name: "Sunset", colors: [[0.10, 0.05, 0.10], [0.62, 0.22, 0.28], [0.50, 0.38, 0.20], [0.18, 0.05, 0.12]] },
  { name: "Forest", colors: [[0.04, 0.09, 0.07], [0.08, 0.32, 0.26], [0.10, 0.20, 0.32], [0.05, 0.11, 0.10]] },
  { name: "Plum", colors: [[0.10, 0.05, 0.14], [0.50, 0.16, 0.50], [0.26, 0.10, 0.42], [0.08, 0.04, 0.12]] },
  { name: "Cyber", colors: [[0.04, 0.06, 0.12], [0.06, 0.42, 0.52], [0.55, 0.10, 0.38], [0.05, 0.05, 0.12]] },
  { name: "Ember", colors: [[0.10, 0.04, 0.04], [0.62, 0.26, 0.10], [0.45, 0.10, 0.10], [0.10, 0.05, 0.05]] },
  { name: "Ice", colors: [[0.05, 0.07, 0.12], [0.20, 0.32, 0.55], [0.32, 0.42, 0.58], [0.07, 0.09, 0.16]] },
];

function LeftPanel() {
  const [paletteIndex, setPaletteIndex] = useState(3);
  const palette = PALETTES[paletteIndex];

  const shuffle = () => {
    setPaletteIndex((current) => {
      let next = current;
      while (next === current) next = Math.floor(Math.random() * PALETTES.length);
      return next;
    });
  };

  return (
    <div className="relative hidden overflow-hidden bg-[#0a0a0c] lg:block">
      <MeshShader palette={palette} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 50%, transparent 35%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <div className="relative flex h-full flex-col justify-between p-12">
        <div className="flex items-start justify-between">
          <Link
            href="/auth/login"
            className="inline-flex w-fit items-center gap-1.5 rounded-md bg-black/20 px-2 py-1 font-mono text-[11px] text-white/65 uppercase tracking-[0.2em] backdrop-blur-sm transition-colors hover:text-white"
          >
            <IconChevronLeft className="size-3.5" />
            Sign In
          </Link>
          <ShuffleButton onClick={shuffle} paletteName={palette.name} />
        </div>
        <div className="max-w-md">
          <h2
            className="font-heading font-semibold text-3xl leading-tight md:text-4xl"
            style={{ textShadow: "0 1px 24px rgba(0,0,0,0.55)" }}
          >
            <span className="text-white">Oneline.</span>
            <br />
            <span className="text-white/55">Less</span>{" "}
            <span className="text-white">hassle,</span>{" "}
            <span className="text-white/55">more done.</span>
          </h2>
          <p
            className="mt-5 max-w-sm text-sm text-white/65 leading-relaxed"
            style={{ textShadow: "0 1px 16px rgba(0,0,0,0.55)" }}
          >
            Join thousands of developers already building with Nodeline.
          </p>
        </div>
      </div>
    </div>
  );
}

function ShuffleButton({ onClick, paletteName }: { onClick: () => void; paletteName: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/30 px-2.5 py-1.5 text-white/75 backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-black/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
    >
      <IconSunsetFilled className="size-3.5 transition-transform group-hover:rotate-12" />
      <span className="font-mono text-[10px] uppercase tracking-[0.2em]">{paletteName}</span>
    </button>
  );
}

// WebGL shader (same as login page)
const VERT_SRC = `attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.0,1.0);}`;
const FRAG_SRC = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_c0, u_c1, u_c2, u_c3;
void main(){
  vec2 uv=gl_FragCoord.xy/u_resolution; uv.y=1.0-uv.y;
  float t=u_time*0.00015;
  vec2 p0=vec2(0.30+sin(t*0.70)*0.25,0.25+cos(t*0.60)*0.20);
  vec2 p1=vec2(0.75+cos(t*0.50)*0.20,0.70+sin(t*0.80)*0.20);
  vec2 p2=vec2(0.50+sin(t*0.40+1.0)*0.30,0.50+cos(t*0.70)*0.25);
  vec2 p3=vec2(0.20+cos(t*0.55)*0.20,0.85+sin(t*0.45)*0.15);
  float r=0.55;
  float d0=pow(1.0-smoothstep(0.0,r,distance(uv,p0)),1.4);
  float d1=pow(1.0-smoothstep(0.0,r,distance(uv,p1)),1.4);
  float d2=pow(1.0-smoothstep(0.0,r,distance(uv,p2)),1.4);
  float d3=pow(1.0-smoothstep(0.0,r,distance(uv,p3)),1.4);
  float total=d0+d1+d2+d3+0.0001;
  vec3 col=(u_c0*d0+u_c1*d1+u_c2*d2+u_c3*d3)/total;
  float n=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
  col+=(n-0.5)*0.025;
  gl_FragColor=vec4(col,1.0);
}`;

function MeshShader({ palette }: { palette: Palette }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetRef = useRef(palette.colors);
  const currentRef = useRef(palette.colors.map((c) => [...c]) as Palette["colors"]);

  useEffect(() => { targetRef.current = palette.colors; }, [palette]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { gl.deleteShader(sh); return null; }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT_SRC);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(posLoc); gl.vertexAttribPointer(posLoc,2,gl.FLOAT,false,0,0);
    const uRes=gl.getUniformLocation(prog,"u_resolution"), uTime=gl.getUniformLocation(prog,"u_time");
    const uC0=gl.getUniformLocation(prog,"u_c0"), uC1=gl.getUniformLocation(prog,"u_c1");
    const uC2=gl.getUniformLocation(prog,"u_c2"), uC3=gl.getUniformLocation(prog,"u_c3");
    const resize = () => {
      const dpr=Math.min(window.devicePixelRatio||1,2);
      const w=Math.max(1,Math.floor(canvas.clientWidth*dpr));
      const h=Math.max(1,Math.floor(canvas.clientHeight*dpr));
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
    };
    const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
    let raf=0; const start=performance.now();
    const tick = (now: number) => {
      const t=now-start; const k=0.06;
      for(let i=0;i<4;i++) for(let j=0;j<3;j++) currentRef.current[i][j]+=(targetRef.current[i][j]-currentRef.current[i][j])*k;
      gl.uniform2f(uRes,canvas.width,canvas.height); gl.uniform1f(uTime,t);
      const c=currentRef.current; gl.uniform3f(uC0,c[0][0],c[0][1],c[0][2]);
      gl.uniform3f(uC1,c[1][0],c[1][1],c[1][2]); gl.uniform3f(uC2,c[2][0],c[2][1],c[2][2]);
      gl.uniform3f(uC3,c[3][0],c[3][1],c[3][2]); gl.drawArrays(gl.TRIANGLES,0,6);
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>{cancelAnimationFrame(raf);ro.disconnect();gl.deleteProgram(prog);gl.deleteShader(vs);gl.deleteShader(fs);gl.deleteBuffer(buf);};
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 block h-full w-full" />;
}

function RightPanel() {
  return (
    <div className="relative flex min-h-[680px] flex-col overflow-y-auto bg-card text-foreground">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10 lg:py-14">
        <BrandMark />
        <Heading />
        <RegisterForm />
        <FooterLinks />
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center justify-center">
      <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-muted">
        <IconUser className="size-5" />
      </div>
    </div>
  );
}

function Heading() {
  return (
    <div className="mt-12 flex flex-col gap-1.5">
      <h1 className="font-heading font-semibold text-2xl tracking-tight">
        Buat Akun
      </h1>
      <p className="text-muted-foreground text-sm">
        Daftar untuk mulai menggunakan Nodeline.
      </p>
    </div>
  );
}

function RegisterForm() {
  const register = useRegister();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});

    // Client-side validation
    const result = registerSchema.safeParse({ name, email, password });
    if (!result.error) {
      register.mutate(
        { name: name.trim(), email: email.trim(), password },
        {
          onError: (err: unknown) => handleApiError(err, setFieldErrors, toast),
        },
      );
      return;
    }

    // Map zod errors to field-level errors
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      if (!errors[field]) errors[field] = issue.message;
    }
    setFieldErrors(errors);
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="register-name">
          Nama <span className="text-muted-foreground">*</span>
        </FieldLabel>
        <Input
          id="register-name"
          type="text"
          required
          placeholder="Nama lengkap"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldErrors.name ? "border-destructive" : ""}
        />
        {fieldErrors.name && (
          <p className="mt-1 text-xs text-destructive">{fieldErrors.name}</p>
        )}
      </Field>

      <Field>
        <FieldLabel htmlFor="register-email">
          Email <span className="text-muted-foreground">*</span>
        </FieldLabel>
        <Input
          id="register-email"
          type="email"
          required
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldErrors.email ? "border-destructive" : ""}
        />
        {fieldErrors.email && (
          <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>
        )}
      </Field>

      <Field>
        <FieldLabel htmlFor="register-password">
          Password <span className="text-muted-foreground">*</span>
        </FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="register-password"
            type={reveal ? "text" : "password"}
            required
            placeholder="Min. 8 karakter, huruf besar, kecil & angka"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldErrors.password ? "border-destructive" : ""}
          />
          <InputGroupAddon align="inline-end">
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              aria-label={reveal ? "Sembunyikan password" : "Tampilkan password"}
              className="cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {reveal ? <IconEyeOff className="size-4" /> : <IconEye className="size-4" />}
            </button>
          </InputGroupAddon>
        </InputGroup>
        {fieldErrors.password && (
          <p className="mt-1 text-xs text-destructive">{fieldErrors.password}</p>
        )}
      </Field>

      {/* API-level error */}
      {!!register.error && !fieldErrors.email && !fieldErrors.password && (
        <p className="text-xs text-destructive">
          {(register.error as unknown as { message: string }).message}
        </p>
      )}

      <Button type="submit" size="lg" className="mt-2" disabled={register.isPending}>
        {register.isPending ? "Mendaftarkan..." : "Daftar"}
      </Button>
    </form>
  );
}

function FooterLinks() {
  return (
    <div className="mt-6 flex items-center justify-between gap-4 text-sm">
      <p className="text-muted-foreground">
        Sudah punya akun?{" "}
        <Link href="/auth/login" className="text-foreground hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}

function handleApiError(
  err: unknown,
  setFieldErrors: (errors: Record<string, string>) => void,
  toast: ReturnType<typeof useToast>,
) {
  const apiError = err as ApiError;

  // 409 — email already registered
  if (apiError.statusCode === 409) {
    setFieldErrors({ email: "Email sudah terdaftar" });
    return;
  }

  // 429 — rate limited
  if (apiError.statusCode === 429) {
    toast.error("Terlalu banyak percobaan, coba lagi nanti");
    return;
  }

  // 400 — validation errors from backend (field-specific)
  if (apiError.statusCode === 400 && Array.isArray(apiError.message)) {
    // Backend returns array of error strings, show first few as generic
    toast.error(apiError.message.slice(0, 2).join(". "));
    return;
  }

  // Fallback
  const msg = typeof apiError.message === "string" ? apiError.message : "Terjadi kesalahan";
  toast.error(msg);
}
