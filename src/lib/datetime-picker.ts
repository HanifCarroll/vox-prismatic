import prompts from 'prompts';

/**
 * Interactive date/time picker using split flow approach
 */

export interface DateTimeSelection {
  dateTime: Date;
  confirmed: boolean;
}

/**
 * Helper function to generate next N days as choices
 */
const generateNextDays = (count: number): Array<{ title: string; value: string; description: string }> => {
  const today = new Date();
  const choices: Array<{ title: string; value: string; description: string }> = [];
  
  for (let i = 1; i <= count; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const relativeDay = i === 1 ? 'Tomorrow' : `${i} days from now`;
    
    choices.push({
      title: `📅 ${dayName}, ${monthDay}`,
      description: relativeDay,
      value: date.toISOString().split('T')[0] // YYYY-MM-DD format
    });
  }
  
  return choices;
};

/**
 * Helper function to generate time slots for a category
 */
const generateTimeSlots = (category: string): Array<{ title: string; value: string }> => {
  const slots: Array<{ title: string; value: string }> = [];
  
  let startHour: number;
  let endHour: number;
  
  switch (category) {
    case 'morning':
      startHour = 6;
      endHour = 12;
      break;
    case 'afternoon':
      startHour = 12;
      endHour = 18;
      break;
    case 'evening':
      startHour = 18;
      endHour = 24;
      break;
    default:
      return [];
  }
  
  for (let hour = startHour; hour < endHour; hour++) {
    // Add on-the-hour slots
    const hourStr = hour.toString().padStart(2, '0');
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour < 12 ? 'AM' : 'PM';
    
    slots.push({
      title: `🕐 ${displayHour}:00 ${ampm}`,
      value: `${hourStr}:00`
    });
    
    // Add 30-minute slots
    if (hour < endHour - 1 || category === 'evening') {
      slots.push({
        title: `🕐 ${displayHour}:30 ${ampm}`,
        value: `${hourStr}:30`
      });
    }
  }
  
  return slots;
};

/**
 * Helper function to format date choice display
 */
const formatDateChoice = (date: Date): string => {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return `${dayName}, ${monthDay}`;
};

/**
 * Helper function to validate if datetime is in the future
 */
const validateDateTime = (dateTime: Date): boolean => {
  const now = new Date();
  return dateTime > now;
};

/**
 * Date selection component
 */
const selectDate = async (): Promise<Date | null> => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  const choices = [
    {
      title: '📅 Today',
      description: formatDateChoice(today),
      value: 'today'
    },
    {
      title: '📅 Tomorrow', 
      description: formatDateChoice(tomorrow),
      value: 'tomorrow'
    },
    ...generateNextDays(7),
    {
      title: '📅 Custom Date',
      description: 'Enter a specific date',
      value: 'custom'
    },
    {
      title: '❌ Cancel',
      description: 'Return to post scheduling',
      value: 'cancel'
    }
  ];
  
  const response = await prompts({
    type: 'select',
    name: 'dateChoice',
    message: 'Select a date for scheduling:',
    choices: choices
  });
  
  if (!response.dateChoice || response.dateChoice === 'cancel') {
    return null; // User cancelled
  }
  
  let selectedDate: Date;
  
  switch (response.dateChoice) {
    case 'today':
      selectedDate = today;
      break;
    case 'tomorrow':
      selectedDate = tomorrow;
      break;
    case 'custom':
      const customResponse = await prompts({
        type: 'date',
        name: 'customDate',
        message: 'Enter custom date (YYYY-MM-DD):',
        initial: new Date(),
        mask: 'YYYY-MM-DD'
      });
      
      if (!customResponse.customDate) {
        return null;
      }
      
      selectedDate = new Date(customResponse.customDate);
      break;
    default:
      // It's one of the generated next days
      selectedDate = new Date(response.dateChoice);
      break;
  }
  
  return selectedDate;
};

/**
 * Time selection component
 */
const selectTime = async (): Promise<{ hour: number; minute: number } | null> => {
  // First: choose time category
  const categoryResponse = await prompts({
    type: 'select',
    name: 'category',
    message: 'What time of day?',
    choices: [
      {
        title: '🌅 Morning (6 AM - 12 PM)',
        description: 'Best for professional content',
        value: 'morning'
      },
      {
        title: '☀️ Afternoon (12 PM - 6 PM)',
        description: 'Peak engagement hours',
        value: 'afternoon'
      },
      {
        title: '🌙 Evening (6 PM - 12 AM)',
        description: 'Personal and social content',
        value: 'evening'
      },
      {
        title: '🕐 Custom Time',
        description: 'Enter specific time',
        value: 'custom'
      },
      {
        title: '← Back to Date Selection',
        description: 'Go back and choose a different date',
        value: 'back'
      }
    ]
  });
  
  if (!categoryResponse.category) {
    return null; // User cancelled
  }
  
  if (categoryResponse.category === 'back') {
    return { hour: -1, minute: -1 }; // Special value to indicate "go back"
  }
  
  if (categoryResponse.category === 'custom') {
    const customTimeResponse = await prompts([
      {
        type: 'number',
        name: 'hour',
        message: 'Enter hour (0-23):',
        min: 0,
        max: 23,
        initial: 9
      },
      {
        type: 'select',
        name: 'minute',
        message: 'Select minutes:',
        choices: [
          { title: ':00', value: 0 },
          { title: ':15', value: 15 },
          { title: ':30', value: 30 },
          { title: ':45', value: 45 },
          { title: '🔢 Custom minutes', description: 'Enter any minute (0-59)', value: 'custom' },
          { title: '← Back to Time Categories', value: 'back' }
        ]
      }
    ]);
    
    if (customTimeResponse.minute === 'back') {
      // Go back to time category selection
      return await selectTime();
    }
    
    if (customTimeResponse.hour === undefined || customTimeResponse.minute === undefined) {
      return null;
    }
    
    let finalMinute = customTimeResponse.minute;
    
    // If user selected custom minutes, prompt for specific value
    if (customTimeResponse.minute === 'custom') {
      const customMinuteResponse = await prompts({
        type: 'number',
        name: 'customMinute',
        message: 'Enter minutes (0-59):',
        min: 0,
        max: 59,
        initial: 0
      });
      
      if (customMinuteResponse.customMinute === undefined) {
        return null;
      }
      
      finalMinute = customMinuteResponse.customMinute;
    }
    
    return {
      hour: customTimeResponse.hour,
      minute: finalMinute
    };
  }
  
  // Show time slots for the selected category
  const timeSlots = generateTimeSlots(categoryResponse.category);
  
  // Add back navigation to time slots
  timeSlots.push({
    title: '← Back to Time Categories',
    value: 'back'
  });
  
  const timeResponse = await prompts({
    type: 'select',
    name: 'time',
    message: 'Select a specific time:',
    choices: timeSlots
  });
  
  if (timeResponse.time === 'back') {
    // Recursively call selectTime to go back to category selection
    return await selectTime();
  }
  
  if (!timeResponse.time) {
    return null; // User cancelled
  }
  
  // Parse the time string (HH:MM format)
  const [hourStr, minuteStr] = timeResponse.time.split(':');
  return {
    hour: parseInt(hourStr, 10),
    minute: parseInt(minuteStr, 10)
  };
};

/**
 * Combine date and time into a single DateTime
 */
const combineDateTime = (date: Date, time: { hour: number; minute: number }): Date => {
  const combined = new Date(date);
  combined.setHours(time.hour, time.minute, 0, 0);
  return combined;
};

/**
 * Main function for interactive custom date/time selection
 */
export const selectCustomDateTime = async (): Promise<DateTimeSelection> => {
  console.log('\n📅 Custom Date & Time Selection');
  console.log('─'.repeat(40));
  
  try {
    // Step 1: Select date
    const selectedDate = await selectDate();
    if (!selectedDate) {
      return { dateTime: new Date(), confirmed: false };
    }
    
    // Step 2: Select time
    const selectedTime = await selectTime();
    if (!selectedTime) {
      return { dateTime: new Date(), confirmed: false };
    }
    
    // Check if user wants to go back to date selection
    if (selectedTime.hour === -1 && selectedTime.minute === -1) {
      // Recursively restart the process
      return await selectCustomDateTime();
    }
    
    // Step 3: Combine and validate
    const combinedDateTime = combineDateTime(selectedDate, selectedTime);
    
    if (!validateDateTime(combinedDateTime)) {
      console.log('⚠️  Selected time is in the past. Please choose a future date/time.');
      
      const retryResponse = await prompts({
        type: 'confirm',
        name: 'retry',
        message: 'Would you like to try again?',
        initial: true
      });
      
      if (retryResponse.retry) {
        return await selectCustomDateTime(); // Recursive retry
      } else {
        return { dateTime: new Date(), confirmed: false };
      }
    }
    
    // Step 4: Confirmation
    const formattedDateTime = combinedDateTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    console.log(`\n📋 Selected Date & Time:`);
    console.log(`   ${formattedDateTime}`);
    
    const confirmResponse = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: 'Schedule post for this date and time?',
      initial: true
    });
    
    return {
      dateTime: combinedDateTime,
      confirmed: !!confirmResponse.confirm
    };
    
  } catch (error) {
    console.error('Error in date/time selection:', error);
    return { dateTime: new Date(), confirmed: false };
  }
};