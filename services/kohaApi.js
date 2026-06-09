import axios from "axios";

const API = axios.create({
  // Change this depending on your environment (Web, Physical Device, etc.)
  baseURL: "http://localhost:8001/api/v1", 
  timeout: 5000,
});

export const getPatronByCard = async (cardNumber) => {
  try {
    const response = await API.get(`/patrons`, {
      params: {
        cardnumber: cardNumber,
      },
    });

    return response.data;
  } catch (error) {
    console.error("KOHA API Error:", error);
    return null;
  }
};
