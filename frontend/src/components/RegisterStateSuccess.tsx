import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { Avatar, Box, Button, Paper, Typography } from "@mui/material";

interface Props {
	username: string;
	onLogin: () => void;
}

export default function RegisterStateSuccess({ username, onLogin }: Props) {
	return (
		<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", bgcolor: "grey.50" }}>
			<Paper elevation={0} variant="outlined" sx={{ p: 5, maxWidth: 400, width: "100%", textAlign: "center", borderRadius: 3 }}>
				<Avatar sx={{ width: 56, height: 56, bgcolor: "success.light", mx: "auto", mb: 2.5 }}>
					<CheckCircleOutlineIcon sx={{ color: "success.dark", fontSize: 30 }} />
				</Avatar>
				<Typography variant="h6" fontWeight={500} gutterBottom>
					Email confirmed
				</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
					Welcome to Trackeats,{" "}
					<Typography component="span" variant="body2" fontWeight={500} color="text.primary">
						{username}
					</Typography>
					. Your account is ready.
				</Typography>
				<Button variant="contained" disableElevation onClick={onLogin} sx={{ borderRadius: 2, px: 4, py: 1.25, textTransform: "none", fontSize: 14 }}>
					Log in to Trackeats
				</Button>
			</Paper>
		</Box>
	);
}