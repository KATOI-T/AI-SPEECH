/**
 * F-006: AI会話生成 - MessageDisplayコンポーネントのテスト
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MessageDisplay } from '../MessageDisplay';

describe('MessageDisplay', () => {
  describe('User message', () => {
    it('should render user message correctly', () => {
      render(
        <MessageDisplay
          role="user"
          content="Hello, I would like to order coffee"
        />
      );

      const message = screen.getByText('Hello, I would like to order coffee');
      expect(message).toBeInTheDocument();
    });

    it('should apply user-specific styles', () => {
      const { container } = render(
        <MessageDisplay role="user" content="Test message" />
      );

      const messageContainer = container.querySelector('.items-end');
      expect(messageContainer).toBeInTheDocument();

      const messageBox = container.querySelector('.bg-blue-600');
      expect(messageBox).toBeInTheDocument();
    });
  });

  describe('Assistant message', () => {
    it('should render assistant message with character name', () => {
      render(
        <MessageDisplay
          role="assistant"
          content="Welcome! How can I help you?"
          characterName="Miku"
        />
      );

      expect(screen.getByText('Miku')).toBeInTheDocument();
      expect(screen.getByText('Welcome! How can I help you?')).toBeInTheDocument();
    });

    it('should render emotion badge when emotion is not neutral', () => {
      render(
        <MessageDisplay
          role="assistant"
          content="I'm so happy to see you!"
          emotion="happy"
          characterName="Miku"
        />
      );

      expect(screen.getByText('嬉しい')).toBeInTheDocument();
    });

    it('should not render emotion badge for neutral emotion', () => {
      render(
        <MessageDisplay
          role="assistant"
          content="How can I help you?"
          emotion="neutral"
          characterName="Miku"
        />
      );

      expect(screen.queryByText('普通')).not.toBeInTheDocument();
    });

    it('should apply assistant-specific styles', () => {
      const { container } = render(
        <MessageDisplay
          role="assistant"
          content="Test message"
          characterName="Miku"
        />
      );

      const messageContainer = container.querySelector('.items-start');
      expect(messageContainer).toBeInTheDocument();

      const messageBox = container.querySelector('.text-slate-100');
      expect(messageBox).toBeInTheDocument();
    });

    it('should handle all emotion types', () => {
      const emotions = ['happy', 'sad', 'surprised', 'angry'];
      const labels = ['嬉しい', '悲しい', '驚き', '怒り'];

      emotions.forEach((emotion, index) => {
        const { rerender } = render(
          <MessageDisplay
            role="assistant"
            content="Test"
            emotion={emotion}
            characterName="Miku"
          />
        );

        expect(screen.getByText(labels[index])).toBeInTheDocument();

        rerender(<div />);
      });
    });

    it('should handle unknown emotion gracefully', () => {
      render(
        <MessageDisplay
          role="assistant"
          content="Test"
          emotion="unknown"
          characterName="Miku"
        />
      );

      expect(screen.getByText('unknown')).toBeInTheDocument();
    });
  });

  describe('Content rendering', () => {
    it('should preserve whitespace and line breaks', () => {
      const multilineContent = 'Line 1\nLine 2\nLine 3';

      const { container } = render(
        <MessageDisplay role="user" content={multilineContent} />
      );

      const paragraph = container.querySelector('.whitespace-pre-wrap');
      expect(paragraph).toBeInTheDocument();
      expect(paragraph?.textContent).toBe(multilineContent);
    });
  });
});
