"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Box } from "@mui/material";
import {
  Alert,
  Button,
  Card,
  NuamThemeWrapper,
  TextField,
  Typography,
} from "@nuam/common-fe-lib-components";
import { setAuthenticated } from "@/lib/mock-auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Ingresa tu usuario y contraseña.");
      return;
    }

    setError("");
    setAuthenticated(true);
    router.push("/");
  };

  return (
    <NuamThemeWrapper>
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
          px: 2,
        }}
      >
        <Card sx={{ width: "100%", maxWidth: 380, p: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "center", pt: 3 }}>
            <Image src="/nuam-isotype.svg" alt="nuam" width={140} height={40} priority style={{ height: 40, width: "auto" }} />
          </Box>

          <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              Iniciar sesión
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", mb: 3 }}
            >
              nuam Trading Workstation — acceso de demostración
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="Usuario"
                type="email"
                fullWidth
                autoFocus
                value={email}
                onChange={(value) => setEmail(String(value))}
              />
              <TextField
                label="Contraseña"
                type="password"
                fullWidth
                value={password}
                onChange={(value) => setPassword(String(value))}
              />
            </Box>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 3 }}
            >
              Ingresar
            </Button>

            <Typography
              variant="caption"
              sx={{ display: "block", textAlign: "center", color: "text.secondary", mt: 2 }}
            >
              Demo: cualquier usuario y contraseña funcionan.
            </Typography>
          </Box>
        </Card>
      </Box>
    </NuamThemeWrapper>
  );
}
