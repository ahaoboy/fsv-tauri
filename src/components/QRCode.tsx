import { useState, useEffect } from "react";
import { Paper, CircularProgress, Typography, Box } from "@mui/material";
import QRCodeLib from "qrcode";

interface QRCodeProps {
  url: string;
  size?: number;
}

/**
 * QRCode — generates and displays a QR code for the given URL.
 * Shows a loading placeholder while the QR code is being generated.
 */
export function QRCode({ url, size = 180 }: QRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    if (!url) return;

    QRCodeLib.toDataURL(url, {
      width: size,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then(setDataUrl)
      .catch(console.error);
  }, [url, size]);

  if (!dataUrl) {
    return (
      <Paper
        variant="outlined"
        sx={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress size={24} />
          <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
            Generating QR...
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 1, lineHeight: 0 }}>
      <Box
        component="img"
        src={dataUrl}
        width={size}
        height={size}
        alt={`QR code for ${url}`}
        sx={{ borderRadius: 1 }}
      />
    </Paper>
  );
}
