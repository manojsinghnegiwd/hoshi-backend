import { getCurrentDateTime } from './tools/get_current_datetime';

export const dateTimeExtension = {
  name: "date-time",
  description: "Internal extension for providing current date and time information",
  type: "internal",
  tools: [
    getCurrentDateTime
  ]
};

export default dateTimeExtension; 