import Phaser from 'phaser';
import { generateGameTextures } from '../graphics/assetGenerator.js';
import { soundSystem } from '../audio/soundSystem.js';
import { networkManager } from '../network/networkManager.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    // Generate all procedural pixel textures
    generateGameTextures(this);

    // Wire sound system to network events
    networkManager.onSoundEvent = (sound, weapon) => {
      soundSystem.playSound(sound, weapon);
    };

    networkManager.onGameEvent = (event, text, color) => {
      if (text) {
        this.showBanner(text, color || '#38bdf8');
      }
    };

    this.scene.start('LobbyScene');
  }

  private showBanner(text: string, color: string): void {
    const container = document.getElementById('banner-container');
    if (!container) return;

    const banner = document.createElement('div');
    banner.className = 'game-banner';
    banner.style.color = color;
    banner.style.borderColor = color;
    banner.textContent = text;

    container.appendChild(banner);
    setTimeout(() => {
      banner.remove();
    }, 3500);
  }
}
