"use client";

import { useRouter } from "next/navigation";
import { Box } from "@mui/material";
import {
  Button,
  Card,
  NuamThemeWrapper,
  Typography,
} from "@nuam/common-fe-lib-components";

const flows = [
  {
    title: "Workstation B2B",
    description:
      "El dashboard de trading actual, construido con @nuam/common-fe-lib-components + MUI.",
    href: "/workstation",
  },
];

export function ChooserScreen() {
  const router = useRouter();

  return (
    <NuamThemeWrapper>
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
          px: 2,
          gap: 4,
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            nuam Trading Workstation
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Elige qué flujo quieres explorar
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 3,
            justifyContent: "center",
          }}
        >
          {flows.map((flow) => (
            <Card
              key={flow.href}
              sx={{
                width: 320,
                p: 3,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {flow.title}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", flex: 1 }}
              >
                {flow.description}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={() => router.push(flow.href)}
              >
                Entrar
              </Button>
            </Card>
          ))}
        </Box>
      </Box>
    </NuamThemeWrapper>
  );
}
