import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Container, Box, IconButton, Button, Grid, CssBaseline
} from '@mui/material';
import { createTheme, ThemeProvider, styled, keyframes } from '@mui/material/styles';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

// Keyframes for the animations
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: '15px',
  overflow: 'hidden',
  boxShadow: theme.shadows[5],
  animation: `${fadeIn} 0.5s ease-out`
}));

const AnimatedTableRow = styled(TableRow)(({ theme }) => ({
  animation: `${fadeIn} 0.5s ease-out`,
}));

const EventDetailsContainer = styled(Box)(({ theme }) => ({
  borderRadius: '15px',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[3],
  animation: `${fadeIn} 0.5s ease-out`
}));

const ClickEventTable = () => {
  const [clickData, setClickData] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [darkMode, setDarkMode] = useState(true);

  const fetchData = async () => {
    try {
      const response = await axios.get('http://localhost:3000/data');
      setClickData(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const flattenObject = (obj, res = {}) => {
    for (let key in obj) {
      if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        flattenObject(obj[key], res);
      } else {
        res[key] = obj[key];
      }
    }
    return res;
  };

  const renderDetails = (data) => {
    const flatData = flattenObject(data);
    const entries = Object.entries(flatData);
    const half = Math.ceil(entries.length / 2);
    const leftEntries = entries.slice(0, half);
    const rightEntries = entries.slice(half);

    return (
      <Grid container spacing={2}>
        <Grid item xs={6}>
          {leftEntries.map(([key, value]) => (
            <Box key={key} mb={2} display="flex">
              <Typography variant="body2" component="div" style={{ fontWeight: 'bold', marginRight: '10px', color: theme.palette.text.primary }}>
                {key}:
              </Typography>
              <Typography variant="body2" component="div" style={{ color: theme.palette.text.primary }}>
                {typeof value === 'object' ? JSON.stringify(value) : value}
              </Typography>
            </Box>
          ))}
        </Grid>
        <Grid item xs={6}>
          {rightEntries.map(([key, value]) => (
            <Box key={key} mb={2} display="flex">
              <Typography variant="body2" component="div" style={{ fontWeight: 'bold', marginRight: '10px', color: theme.palette.text.primary }}>
                {key}:
              </Typography>
              <Typography variant="body2" component="div" style={{ color: theme.palette.text.primary }}>
                {typeof value === 'object' ? JSON.stringify(value) : value}
              </Typography>
            </Box>
          ))}
        </Grid>
      </Grid>
    );
  };

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      background: {
        default: darkMode ? '#121212' : '#ffffff',
        paper: darkMode ? '#1d1d1d' : '#f5f5f5',
      },
      text: {
        primary: darkMode ? '#ffffff' : '#000000',
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container style={{ padding: '20px', minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} style={{ color: theme.palette.text.primary }}>
          <Typography variant="h4" component="h1">
            Click Event Data
          </Typography>
          <IconButton onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Box>
        {selectedEvent ? (
          <EventDetailsContainer>
            <Button onClick={() => setSelectedEvent(null)} variant="contained" color="primary" style={{ marginBottom: '20px' }}>
              Back to Event List
            </Button>
            <Typography variant="h5" gutterBottom>
              Event Details
            </Typography>
            <Box>
              {renderDetails(selectedEvent)}
            </Box>
          </EventDetailsContainer>
        ) : (
          <StyledTableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell style={{ fontWeight: 'bold', color: theme.palette.text.primary }}>Username</TableCell>
                  <TableCell style={{ fontWeight: 'bold', color: theme.palette.text.primary }}>Event Name</TableCell>
                  <TableCell style={{ fontWeight: 'bold', color: theme.palette.text.primary }}>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clickData.map((item) => (
                  <AnimatedTableRow key={item._id}>
                    <TableCell onClick={() => setSelectedEvent(item)} style={{ cursor: 'pointer', color: theme.palette.text.primary }}>
                      {item.localStorageData && item.localStorageData.name ? item.localStorageData.name : 'N/A'}
                    </TableCell>
                    <TableCell onClick={() => setSelectedEvent(item)} style={{ cursor: 'pointer', color: theme.palette.text.primary }}>
                      {item.eventName}
                    </TableCell>
                    <TableCell onClick={() => setSelectedEvent(item)} style={{ cursor: 'pointer', color: theme.palette.text.primary }}>
                      {item.DateTime ? item.DateTime : 'N/A'}
                    </TableCell>
                  </AnimatedTableRow>
                ))}
              </TableBody>
            </Table>
          </StyledTableContainer>
        )}
      </Container>
    </ThemeProvider>
  );
};

export default ClickEventTable;
