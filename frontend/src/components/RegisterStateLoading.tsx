import { Box, CircularProgress, Paper, Typography } from "@mui/material";

export default function RegisterStateLoading() {
	return (
		<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", bgcolor: "grey.50" }}>
			<Paper elevation={0} variant="outlined" sx={{ p: 5, maxWidth: 400, width: "100%", textAlign: "center", borderRadius: 3 }}>
				<CircularProgress size={48} thickness={3} sx={{ color: "text.disabled", mb: 2.5 }} />
				<Typography variant="h6" fontWeight={500} gutterBottom>
					Confirming your email…
				</Typography>
				<Typography variant="body2" color="text.secondary">
					Just a moment while we verify your link.
				</Typography>
			</Paper>
		</Box>
	);
}