import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { Avatar, Box, Button, Paper, Typography } from "@mui/material";

interface Props {
	message: string;
	onResend: () => void;
}

export default function RegisterStateError({ message, onResend }: Props) {
	return (
		<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", bgcolor: "grey.50" }}>
			<Paper elevation={0} variant="outlined" sx={{ p: 5, maxWidth: 400, width: "100%", textAlign: "center", borderRadius: 3 }}>
				<Avatar sx={{ width: 56, height: 56, bgcolor: "warning.light", mx: "auto", mb: 2.5 }}>
					<ErrorOutlineIcon sx={{ color: "warning.dark", fontSize: 30 }} />
				</Avatar>
				<Typography variant="h6" fontWeight={500} gutterBottom>
					Link expired
				</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
					{message}
				</Typography>
				<Button variant="outlined" onClick={onResend} sx={{ borderRadius: 2, px: 4, py: 1.25, textTransform: "none", fontSize: 14 }}>
					Resend confirmation email
				</Button>
			</Paper>
		</Box>
	);
}