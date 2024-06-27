import { Scene } from "phaser"

export class ProgressBar extends Phaser.GameObjects.Container{
    private barRect: Phaser.GameObjects.Rectangle
    private progressRect: Phaser.GameObjects.Rectangle
    private particles: Phaser.GameObjects.Particles.ParticleEmitter
    private progress: number
    public constructor(scene: Scene) {
        super(scene, 260, 650)
        this.progress = 0.1
        this.scene.add.existing(this)
        this.barRect = this.scene.add.rectangle(0, 0, 500, 30).setStrokeStyle(1, 0xffffff)
        this.progressRect = this.scene.add.rectangle(0, 0, 496, 26, 0x63bbfe)
        this.particles = this.scene.add.particles(0, 0, 'white_flare', {
            lifespan: 500,
            quantity: 20,
            y: {min: -12, max: 12},
            angle: {min: 165, max: 195},
            speed: {min: 50, max: 100},
            scale: { start: 0.1, end: 0 },
        })
        this.add(this.barRect)
        this.add(this.progressRect)
        this.add(this.particles)
    }

    public setProgress(progress: number) {
        this.progressRect.width = progress * 496
        this.particles.x = this.progressRect.x - 496 / 2 + this.progressRect.width
    }
}