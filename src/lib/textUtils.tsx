import React from 'react';

/**
 * Parses text and applies gradient styling to content wrapped in asterisks (*text*)
 * Also handles newlines (\n)
 * 
 * @example
 * parseGradientText("Hello *world*") => ["Hello ", <span className="text-gradient">world</span>]
 * parseGradientText("Line 1\nLine 2") => ["Line 1", <br />, "Line 2"]
 */
export function parseGradientText(text: string): React.ReactNode {
  if (!text) return null;
  
  // First, split by newlines
  const lines = text.split('\n');
  
  return lines.map((line, lineIndex) => {
    // Parse asterisks for gradient effect
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = /\*([^*]+)\*/g;
    let match;
    
    while ((match = regex.exec(line)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }
      // Add the gradient text
      parts.push(
        <span key={`gradient-${lineIndex}-${match.index}`} className="text-gradient">
          {match[1]}
        </span>
      );
      lastIndex = regex.lastIndex;
    }
    
    // Add remaining text after last match
    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }
    
    // If no matches found, just return the line
    if (parts.length === 0) {
      parts.push(line);
    }
    
    return (
      <React.Fragment key={`line-${lineIndex}`}>
        {lineIndex > 0 && <br />}
        {parts}
      </React.Fragment>
    );
  });
}
