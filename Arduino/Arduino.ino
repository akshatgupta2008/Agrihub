const int motorPin = 9;

// Timing durations (in milliseconds)
const int dotDuration = 200;           
const int dashDuration = 600; 
const int symbolSpace = 200;   // Pause between dots/dashes of the same letter

// Morse code alphabet (A-Z)
const char* morseAlphabet[] = {
  ".-", "-...", "-.-.", "-..", ".", "..-.", "--.", "....", "..", 
  ".---", "-.-", ".-..", "--", "-.", "---", ".--.", "--.-", ".-.", 
  "...", "-", "..-", "...-", ".--", "-..-", "-.--", "--.."
};

void setup() {
  pinMode(motorPin, OUTPUT);
  digitalWrite(motorPin, LOW); // Ensure motor is off to start
  
  // Start serial communication at 9600 baud rate
  Serial.begin(9600);
  
  // Print the initial instructions to the terminal
  Serial.println("--- Haptic Feedback Simulator ---");
  Serial.println("Enter an alphabet (A-Z) to feel its vibration pattern.");
}

void loop() {
  // Check if any data has been typed into the Serial Monitor
  if (Serial.available() > 0) {
    
    // Read the incoming byte
    char incomingChar = Serial.read();
    
    // Ignore newline and carriage return characters if the user presses 'Enter'
    if (incomingChar == '\n' || incomingChar == '\r') {
      return; 
    }

    // Convert lowercase letters to uppercase automatically
    if (incomingChar >= 'a' && incomingChar <= 'z') {
      incomingChar -= 32;
    }

    // Check if the input is a valid letter from A to Z
    if (incomingChar >= 'A' && incomingChar <= 'Z') {
      
      int letterIndex = incomingChar - 'A';
      const char* pattern = morseAlphabet[letterIndex];
      
      Serial.print("Vibrating for letter: ");
      Serial.print(incomingChar);
      Serial.print(" (Pattern: ");
      Serial.print(pattern);
      Serial.println(")");

      // Play the haptic pattern
      for (int j = 0; pattern[j] != '\0'; j++) {
        if (pattern[j] == '.') {
          vibrate(dotDuration);
        } else if (pattern[j] == '-') {
          vibrate(dashDuration);
        }
        delay(symbolSpace); 
      }
      
      Serial.println("Done. Enter next letter:");
      Serial.println("------------------------");
      
    } else {
      // Handle invalid inputs (numbers, symbols, etc.)
      Serial.println("Invalid input. Please enter a letter from A to Z.");
    }
  }
}

// Function to trigger the vibration safely
void vibrate(int duration) {
  digitalWrite(motorPin, HIGH); 
  delay(duration);              
  digitalWrite(motorPin, LOW);  
}