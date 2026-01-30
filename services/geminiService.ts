
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, MeetingPlace } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateBio = async (name: string, title: string, interests: string): Promise<string> => {
  const prompt = `Generate a professional and friendly bio for a professional networking app.
  Name: ${name}
  Title: ${title}
  Interests: ${interests}
  Keep it concise, engaging, and suitable for a "Meet Me" page. Max 3 sentences.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return response.text || "Professional networking enthusiast looking to connect with amazing people.";
};

export const findNearbyPlaces = async (
  category: string, 
  location: { lat: number; lng: number }
): Promise<MeetingPlace[]> => {
  const prompt = `Find 5 highly-rated real-world ${category} locations for a business meeting near these coordinates: ${location.lat}, ${location.lng}. 
  Provide the specific name, address, and why it's good for a meeting.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite-latest",
    contents: prompt,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: {
            latitude: location.lat,
            longitude: location.lng
          }
        }
      }
    },
  });

  // Extract grounding metadata to create structured place objects
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  const places: MeetingPlace[] = chunks
    .filter(chunk => chunk.maps)
    .map((chunk, index) => ({
      id: `map-place-${index}-${Date.now()}`,
      name: chunk.maps.title || "Selected Venue",
      address: "See map for details",
      type: category,
      mapUri: chunk.maps.uri,
      snippet: response.text?.substring(0, 200) + "..." // Fallback text context
    }));

  if (places.length === 0) {
    // Fallback if grounding is sparse but text exists
    return [{
      id: 'fallback-1',
      name: "Recommended Local Spot",
      address: "Based on search results",
      type: category,
      snippet: response.text || "A great place for a meeting."
    }];
  }

  return places;
};
