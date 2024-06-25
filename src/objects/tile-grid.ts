import { Scene } from "phaser";
import { ObjectManager } from "./object-manager";
import { Tile } from "./tile";
import { CONST } from "../const/const";
import { EffectManager } from "./effect-manager";

export type Hint = {
    firstX: number,
    firstY: number,
    secondX: number,
    secondY: number
}
export class TileGrid {
    private objectManager: ObjectManager<Tile>
    private effectManager: EffectManager
    private scene: Scene
    private row: number
    private column: number
    private tileGrid: (Tile | undefined)[][]
    private firstSelectedTile: Tile | undefined
    private secondSelectedTile: Tile | undefined
    private canMove: boolean
    private visited: boolean[][]
    public constructor(scene: Scene, row: number, column: number) {
        this.scene = scene
        this.row = row
        this.column = column
        this.canMove = true
        this.objectManager = new ObjectManager(
            (object: Tile) => {
                object.x = -100
                object.y = -100
                object.setTexture('')
                object.setTileNumber(1)
            },
            () => {
                return new Tile({
                    scene: this.scene,
                    x: -100,
                    y: -100,
                    texture: ''
                })
            }
        )
        this.tileGrid = []
        this.visited = Array(this.row).fill(Array(this.column).fill(false))
        for (let y = 0; y < row; y++) {
            this.tileGrid[y] = []
            for (let x = 0; x < column; x++) {
                this.tileGrid[y][x] = this.createTile(x, y)
                // this.tileGrid[y][x]?.explode()
            }
        }

        this.effectManager = new EffectManager(scene, row, column, this.tileGrid)

        this.firstSelectedTile = undefined;
        this.secondSelectedTile = undefined;

        this.scene.input.on("gameobjectdown", this.tileDown)
        this.checkMatches()
    }

    private tileDown = (pointer: Phaser.Input.Pointer) => {
        let y = Math.floor(pointer.y / CONST.tileHeight)
        let x = Math.floor(pointer.x / CONST.tileWidth)
        if (!this.canMove) return
        if (!this.firstSelectedTile) {
            this.firstSelectedTile = this.tileGrid[y][x]
            this.effectManager.setSelectionTween(this.scene.add.tween({
                targets: this.firstSelectedTile,
                scaleX: 0,
                duration: 300,
                ease: 'linear',
                yoyo: true,
                repeat: -1
            }))
        }
        else {
            this.effectManager.removeSelectionTween()
            this.firstSelectedTile.scaleX = 1
            if (this.firstSelectedTile === this.tileGrid[y][x]) {
                this.firstSelectedTile = undefined
                return
            }
            this.secondSelectedTile = this.tileGrid[y][x]
            let dx = Math.abs(this.firstSelectedTile.x - this.secondSelectedTile!.x) / CONST.tileWidth
            let dy = Math.abs(this.firstSelectedTile.y - this.secondSelectedTile!.y) / CONST.tileHeight
            if ((dx == 1 && dy == 0) || (dx == 0 && dy == 1)) {
                this.canMove = false
                this.swapTiles()
            }
            else {
                this.firstSelectedTile = this.tileGrid[y][x]
                this.secondSelectedTile = undefined
                this.effectManager.setSelectionTween(this.scene.add.tween({
                    targets: this.firstSelectedTile,
                    scaleX: 0,
                    duration: 300,
                    ease: 'linear',
                    yoyo: true,
                    repeat: -1
                }))
            }
        }
    }
    private releaseTile(tile: Tile) {
        this.objectManager.returnObject(tile)
    }
    private checkValid(x: number, y: number): boolean {
        return(
            0 <= x && x <= this.column &&
            0 <= y && y <= this.row &&
            this.tileGrid[y][x] !== undefined &&
            this.visited[y][x] === false
        )
    }
    private createTile(x: number, y: number): Tile {
        // Get a random tile
        let randomTileType: string =
            CONST.candyTypes[Phaser.Math.RND.between(0, CONST.candyTypes.length - 1)]
        let newTile = this.objectManager.getObject()
        newTile.setPosition(
            x * CONST.tileWidth + CONST.tileWidth / 2,
            y * CONST.tileHeight + CONST.tileHeight / 2
        )
        newTile.setTexture(randomTileType)
        // Return the created tile
        return newTile
    }
    private getHints(): Hint {
        let result: Hint[] = []
        for (let y = 0; y < this.row; y ++) {
            for (let x = 0; x < this.column; x++) {
                let textureKey = this.tileGrid[y][x]!.texture.key
                this.visited[y][x] = true
                if (this.checkExistMatch(x + 1, y, textureKey)) {
                    result.push({
                        firstX: x,
                        firstY: y,
                        secondX: x + 1,
                        secondY: y
                    })
                }

                if (this.checkExistMatch(x - 1, y, textureKey)) {
                    result.push({
                        firstX: x,
                        firstY: y,
                        secondX: x - 1,
                        secondY: y
                    })
                }
                if (this.checkExistMatch(x, y + 1, textureKey)) {
                    result.push({
                        firstX: x,
                        firstY: y,
                        secondX: x,
                        secondY: y + 1
                    })
                }
                if (this.checkExistMatch(x, y - 1, textureKey)) {
                    result.push({
                        firstX: x,
                        firstY: y,
                        secondX: x,
                        secondY: y - 1
                    })
                }
                this.visited[y][x] = false
            }
        }
        if (result.length == 0) {
            return {
                firstX: -1,
                firstY: -1,
                secondX: -1,
                secondY: -1
            }
        }
        return result[Phaser.Math.RND.between(0, result.length - 1)]
    }
    private checkExistMatch(x: number, y: number, textureKey: string): boolean {
        if (!this.checkValid(x, y)) {
            return false
        }
        // count horizontal
        let count = 1
        for (let i = x - 1; i >= 0; i --) {
            if (this.checkValid(i, y) && this.tileGrid[y][i]!.texture.key === textureKey) {
                count++
            }
            else break
        } 
        for (let i = x + 1; i < this.column; i ++) {
            if (this.checkValid(i, y) && this.tileGrid[y][i]!.texture.key === textureKey) {
                count++
            }
            else break
        }
        if (count >= 3) return true
        count = 1

        // count vertical
        for (let i = y - 1; i >= 0; i --) {
            if (this.checkValid(x, i) && this.tileGrid[i][x]!.texture.key === textureKey) {
                count++
            }
            else break
        }
        for (let i = y + 1; i < this.row; i ++) {
            if (this.checkValid(x, i) && this.tileGrid[i][x]!.texture.key === textureKey) {
                count++
            }
            else break
        }
        return count >= 3
    }
    private swapTiles() {
        if (this.firstSelectedTile && this.secondSelectedTile) {
            // Get the position of the two tiles
            let firstTilePosition = {
                x: this.firstSelectedTile.x,
                y: this.firstSelectedTile.y,
            }

            let secondTilePosition = {
                x: this.secondSelectedTile.x,
                y: this.secondSelectedTile.y,
            }

            // Swap them in our grid with the tiles
            this.tileGrid[(firstTilePosition.y - CONST.tileHeight / 2) / CONST.tileHeight][
                (firstTilePosition.x - CONST.tileWidth / 2) / CONST.tileWidth
            ] = this.secondSelectedTile
            this.tileGrid[(secondTilePosition.y - CONST.tileHeight / 2) / CONST.tileHeight][
                (secondTilePosition.x - CONST.tileWidth / 2) / CONST.tileWidth
            ] = this.firstSelectedTile

            // Move them on the screen with tweens
            this.scene.add.tween({
                targets: this.firstSelectedTile,
                x: this.secondSelectedTile.x,
                y: this.secondSelectedTile.y,
                ease: 'Linear',
                duration: 400,
                repeat: 0,
                yoyo: false,
            })

            this.scene.add.tween({
                targets: this.secondSelectedTile,
                x: this.firstSelectedTile.x,
                y: this.firstSelectedTile.y,
                ease: 'Linear',
                duration: 400,
                repeat: 0,
                yoyo: false,
                onComplete: () => {
                    this.checkMatches()
                },
            })

            this.firstSelectedTile =
                this.tileGrid[(firstTilePosition.y - CONST.tileHeight / 2) / CONST.tileHeight][
                    (firstTilePosition.x - CONST.tileWidth / 2) / CONST.tileWidth
                ]
            this.secondSelectedTile =
                this.tileGrid[(secondTilePosition.y - CONST.tileHeight / 2) / CONST.tileHeight][
                    (secondTilePosition.x - CONST.tileWidth / 2) / CONST.tileWidth
                ]
        }
    }
    private fillTiles(): void{
        let count = 0
        for (let x = 0; x < this.column; x++) {
            let empty = 0
            for (let y = this.row - 1; y >= 0 ; y --) {
                if (this.tileGrid[y][x] === undefined) {
                    empty ++
                    continue
                }
                let tempTile = this.tileGrid[y][x]
                this.tileGrid[y][x] = undefined
                this.tileGrid[y + empty][x] = tempTile
                this.effectManager.activeTweens++
                this.scene.add.tween({
                    targets: tempTile,
                    y: (y + empty) * CONST.tileHeight + CONST.tileHeight / 2,
                    ease:'linear',
                    duration: 400,
                    delay: 100,
                    onComplete: () => {
                        this.effectManager.activeTweens--
                        if (this.effectManager.activeTweens == 0) {
                            this.checkMatches()
                        }
                    }
                })
            }
            for (let y = -1; y >= -empty; y--) {
                let newTile = this.createTile(x, y)
                this.tileGrid[y + empty][x] = newTile
                this.effectManager.activeTweens++
                this.scene.add.tween({
                    targets: newTile,
                    y: (y + empty) * CONST.tileHeight  + CONST.tileHeight / 2,
                    ease: 'linear',
                    duration: 400,
                    repeat: 0,
                    delay: 100,
                    yoyo: false,    
                    onComplete: () => {
                        this.effectManager.activeTweens--
                        if (this.effectManager.activeTweens == 0) {
                            this.checkMatches()
                        }
                    }
                })
            }
            count += empty
        }
        this.tileUp()
    }
    private tileUp() {
        this.firstSelectedTile = undefined
        this.secondSelectedTile = undefined
    }
    private handleExplosionChain(x: number, y: number) {
        
        let tileNum = this.tileGrid[y][x]!.getTileNumber()
        if (tileNum == 1) return
        if (tileNum == 4) {
            for (let i = 0; i < 8; i ++){
                let newY = y + CONST.around[i].y
                let newX = x + CONST.around[i].x
                if (!this.checkValid(newX, newY)) {
                    continue
                }
                this.effectManager.activeTweens++
                let tile = this.tileGrid[newY][newX]!
                this.tileGrid[newY][newX] = undefined
                this.effectManager.activeTweens++
                this.scene.add.tween({
                    targets: tile,
                    duration: 200,
                    onComplete: () => {
                        this.effectManager.explode(newX, newY)
                        this.effectManager.activeTweens--
                        this.releaseTile(tile)
                        if (this.effectManager.activeTweens == 0) {
                            this.fillTiles()
                        }
                    }
                })
                this.visited[newY][newX] = true
                this.handleExplosionChain(newX, newY)
            }
        }
        else if (tileNum == 5) {
            for (let i = 0; i < this.row; i ++) {
                if (!this.checkValid(x, i)) continue
                let tile = this.tileGrid[i][x]!
                this.tileGrid[i][x] = undefined
                this.effectManager.activeTweens++
                this.scene.add.tween({
                    targets: tile,
                    duration: 200,
                    onComplete: () => {
                        this.effectManager.explode(x, i)
                        this.effectManager.activeTweens--
                        this.releaseTile(tile)
                        if (this.effectManager.activeTweens == 0) {
                            this.fillTiles()
                        }
                    }
                })
                this.visited[i][x] = true
                this.handleExplosionChain(x, i)
            }

            for (let i = 0; i < this.column; i ++) {
                if (!this.checkValid(i, y)) continue
                let tile = this.tileGrid[y][i]!
                this.tileGrid[y][i] = undefined
                this.effectManager.activeTweens++
                this.scene.add.tween({
                    targets: tileNum,
                    duration: 200,
                    onComplete: () => {
                        this.effectManager.explode(i, y)
                        this.effectManager.activeTweens--
                        this.releaseTile(tile)
                        if (this.effectManager.activeTweens == 0) {
                            this.fillTiles()
                        }
                    }
                })
                this.visited[y][i] = true
                this.handleExplosionChain(i, y)
            }
        }
    }
    private checkMatches(): void {
        // reset
        for (let y = 0; y < this.row; y ++) {
            for (let x = 0; x < this.column; x ++){
                this.visited[y][x] = false
            }
        }
        // check if there is a crossline match 
        
        // check if there is a horizontal line match
        for (let y = 0; y < this.row; y ++) {
            for (let x = 0; x < this.column; x ++) {
                if (this.tileGrid[y][x] === undefined) continue
                let count = 0
                let tmpX = x
                for (let i = x; i < this.column; i ++) {
                    if (this.tileGrid[y][i] === undefined) break
                    if (this.tileGrid[y][x]!.texture.key === this.tileGrid[y][i]!.texture.key) {
                        count ++
                        if (this.tileGrid[y][i] === this.firstSelectedTile || this.tileGrid[y][i] === this.secondSelectedTile){
                            tmpX = i
                        }
                    }
                    else break
                }
                if (count == 3) {
                    // release the whole group
                    for (let i = x; i < x + 3; i ++){
                        let tile = this.tileGrid[y][i]!
                        this.tileGrid[y][i] = undefined
                        this.effectManager.activeTweens++
                        this.scene.add.tween({
                            targets: tile,
                            duration: 200,
                            onComplete: () => {
                                this.effectManager.explode(i, y)
                                this.effectManager.activeTweens--
                                this.releaseTile(tile)
                                if (this.effectManager.activeTweens == 0) {
                                    this.fillTiles()
                                }
                            }
                        })
                        this.visited[y][i] = true
                        // this.handleExplosionChain(i, y)
                    }
                    
                }
                else if (count > 3) {
                    // group them together at this point and release the others
                    this.tileGrid[y][tmpX]?.setTileNumber(4)
                    for (let i = x; i < x + count; i ++) {
                        if (i == tmpX) continue
                        let tile = this.tileGrid[y][i]!
                        this.tileGrid[y][i] = undefined
                        this.effectManager.activeTweens++
                        this.scene.add.tween({
                            targets: tile,
                            ease: 'linear',
                            duration: 200,
                            x: tmpX * CONST.tileWidth + CONST.tileWidth / 2,
                            repeat: 0,
                            yoyo: false,
                            delay: 100,
                            onComplete: () => {
                                this.effectManager.activeTweens--
                                this.releaseTile(tile)
                                if (this.effectManager.activeTweens == 0) {
                                    this.fillTiles()
                                }
                                
                            }
                        })
                    } 
                }
            }
        }
        
        // check if there is a vertical line match
        for (let x = 0; x < this.column; x ++) {
            for (let y = 0; y < this.row; y ++) {
                if (this.tileGrid[y][x] === undefined) continue
                let count = 0
                let tmpY = y
                for (let i = y; i < this.row; i ++) {
                    if (this.tileGrid[i][x] === undefined) break
                    if (this.tileGrid[y][x]!.texture.key === this.tileGrid[i][x]!.texture.key) {
                        count ++
                        if (this.tileGrid[i][x] === this.firstSelectedTile || this.tileGrid[i][x] === this.secondSelectedTile) {
                            tmpY = i
                        }
                    }
                    else break
                }

                if (count == 3) {
                    // release the whole group
                    for (let i = y; i < y + 3; i ++){
                        let tile = this.tileGrid[i][x]!
                        this.tileGrid[i][x] = undefined
                        this.effectManager.activeTweens++
                        this.scene.add.tween({
                            targets: tile,
                            duration: 200,
                            onComplete: () => {
                                this.effectManager.explode(x, i)
                                this.releaseTile(tile)
                                this.effectManager.activeTweens--
                                if (this.effectManager.activeTweens == 0) {
                                    this.fillTiles()
                                }
                            }
                        })
                        this.visited[i][x]
                        // this.handleExplosionChain(x, i)
                    }
                }
                else if (count > 3) {
                    this.tileGrid[tmpY][x]?.setTileNumber(4)
                    // group them together at this point and release the others
                    for (let i = y; i < y + count; i ++) {
                        if (i == tmpY) continue
                        let tile = this.tileGrid[i][x]!
                        this.tileGrid[i][x] = undefined
                        this.effectManager.activeTweens++
                        this.scene.add.tween({
                            targets: tile,
                            ease: 'linear',
                            duration: 200,
                            y: tmpY * CONST.tileHeight + CONST.tileHeight / 2,
                            repeat: 0,
                            yoyo: false,
                            delay: 100,
                            onComplete: () => {
                                this.effectManager.activeTweens--
                                this.releaseTile(tile)
                                if (this.effectManager.activeTweens == 0) {
                                    this.fillTiles()
                                }
                            }
                        })
                    } 
                }
            }
        }
        if (this.effectManager.activeTweens == 0) {
            this.swapTiles()
            this.tileUp()
            this.canMove = true
        }
    }
}