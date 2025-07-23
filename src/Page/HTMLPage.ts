import { Page, PageDensity, PageOrientation } from './Page';
import { Render } from '../Render/Render';
import { Helper } from '../Helper';
import { FlipDirection } from '../Flip/Flip';
import { Point } from '../BasicTypes';

/**
 * Class representing a book page as a HTML Element
 */
export class HTMLPage extends Page {
    private readonly element: HTMLElement;
    private copiedElement: HTMLElement = null;

    private temporaryCopy: Page = null;

    private isLoad = false;

    private previousHardAngle: number = 0;
    private targetHardAngle: number = 0;
    private isAnimatingHardAngle: boolean = false;
    private hardAngleAnimationId: number | null = null;
    private hardAngleStartTime: number = 0;
    private hardAngleStartAngle: number = 0;

    constructor(render: Render, element: HTMLElement, density: PageDensity) {
        super(render, density);

        this.element = element;
        this.element.classList.add('stf__item');
        this.element.classList.add('--' + density);
    }

    public newTemporaryCopy(): Page {
        if (this.nowDrawingDensity === PageDensity.HARD) {
            return this;
        }

        if (this.temporaryCopy === null) {
            this.copiedElement = this.element.cloneNode(true) as HTMLElement;
            this.element.parentElement.appendChild(this.copiedElement);

            this.temporaryCopy = new HTMLPage(
                this.render,
                this.copiedElement,
                this.nowDrawingDensity,
            );
        }

        return this.getTemporaryCopy();
    }

    public getTemporaryCopy(): Page {
        return this.temporaryCopy;
    }

    public hideTemporaryCopy(): void {
        // 🎯 1. 기존 hideTemporaryCopy 메서드 수정 (이 줄만 추가)
        this.stopHardAngleAnimation();

        if (this.temporaryCopy !== null) {
            this.copiedElement.remove();
            this.copiedElement = null;
            this.temporaryCopy = null;
        }
    }

    public draw(tempDensity?: PageDensity): void {
        const density = tempDensity ? tempDensity : this.nowDrawingDensity;

        const pagePos = this.render.convertToGlobal(this.state.position);
        const pageWidth = this.render.getRect().pageWidth;
        const pageHeight = this.render.getRect().height;

        this.element.classList.remove('--simple');

        const commonStyle = `
            display: block;
            z-index: ${this.element.style.zIndex};
            left: 0;
            top: 0;
            width: ${pageWidth}px;
            height: ${pageHeight}px;
        `;

        density === PageDensity.HARD
            ? this.drawHard(commonStyle)
            : this.drawSoft(pagePos, commonStyle);
    }

    private drawHard(commonStyle = ''): void {
        const pos = this.render.getRect().left + this.render.getRect().width / 2;

        const angle = this.state.hardDrawingAngle;

        const newStyle =
            commonStyle +
            `
                backface-visibility: hidden;
                -webkit-backface-visibility: hidden;
                clip-path: none;
                -webkit-clip-path: none;
            ` +
            (this.orientation === PageOrientation.LEFT
                ? `transform-origin: ${this.render.getRect().pageWidth}px 0; 
                   transform: translate3d(0, 0, 0) rotateY(${angle}deg);`
                : `transform-origin: 0 0; 
                   transform: translate3d(${pos}px, 0, 0) rotateY(${angle}deg);`);

        this.element.style.cssText = newStyle;
    }

    private drawSoft(position: Point, commonStyle = ''): void {
        let polygon = 'polygon( ';
        for (const p of this.state.area) {
            if (p !== null) {
                let g =
                    this.render.getDirection() === FlipDirection.BACK
                        ? {
                              x: -p.x + this.state.position.x,
                              y: p.y - this.state.position.y,
                          }
                        : {
                              x: p.x - this.state.position.x,
                              y: p.y - this.state.position.y,
                          };

                g = Helper.GetRotatedPoint(g, { x: 0, y: 0 }, this.state.angle);
                polygon += g.x + 'px ' + g.y + 'px, ';
            }
        }
        polygon = polygon.slice(0, -2);
        polygon += ')';

        const newStyle =
            commonStyle +
            `transform-origin: 0 0; clip-path: ${polygon}; -webkit-clip-path: ${polygon};` +
            (this.render.isSafari() && this.state.angle === 0
                ? `transform: translate(${position.x}px, ${position.y}px);`
                : `transform: translate3d(${position.x}px, ${position.y}px, 0) rotate(${this.state.angle}rad);`);

        this.element.style.cssText = newStyle;
    }

    public simpleDraw(orient: PageOrientation): void {
        const rect = this.render.getRect();

        const pageWidth = rect.pageWidth;
        const pageHeight = rect.height;

        const x = orient === PageOrientation.RIGHT ? rect.left + rect.pageWidth : rect.left;

        const y = rect.top;

        this.element.classList.add('--simple');
        this.element.style.cssText = `
            position: absolute; 
            display: block; 
            height: ${pageHeight}px; 
            left: ${x}px; 
            top: ${y}px; 
            width: ${pageWidth}px; 
            z-index: ${this.render.getSettings().startZIndex + 1};`;
    }

    public getElement(): HTMLElement {
        return this.element;
    }

    public load(): void {
        this.isLoad = true;
    }

    public setOrientation(orientation: PageOrientation): void {
        super.setOrientation(orientation);
        this.element.classList.remove('--left', '--right');

        this.element.classList.add(orientation === PageOrientation.RIGHT ? '--right' : '--left');
    }

    public setDrawingDensity(density: PageDensity): void {
        this.element.classList.remove('--soft', '--hard');
        this.element.classList.add('--' + density);

        super.setDrawingDensity(density);
    }

    // 🎯 2. 여기부터 새로운 메서드들 추가 (기존 마지막 메서드 다음에)
    public setHardDrawingAngle(angle: number): void {
        const coverDuration = this.render.getSettings().coverDuration || 0;

        if (coverDuration === 0) {
            super.setHardDrawingAngle(angle);
            this.previousHardAngle = angle;
            return;
        }

        if (this.nowDrawingDensity === PageDensity.HARD) {
            if (!this.isAnimatingHardAngle) {
                this.startProgressiveHardAngleAnimation(this.previousHardAngle, angle);
            } else {
                this.targetHardAngle = angle;
            }
        } else {
            super.setHardDrawingAngle(angle);
            this.previousHardAngle = angle;
        }
    }

    private startProgressiveHardAngleAnimation(startAngle: number, targetAngle: number): void {
        if (this.hardAngleAnimationId) {
            cancelAnimationFrame(this.hardAngleAnimationId);
        }

        this.isAnimatingHardAngle = true;
        this.hardAngleStartTime = performance.now();
        this.hardAngleStartAngle = startAngle;
        this.targetHardAngle = targetAngle;

        this.animateHardAngleStep();
    }

    private animateHardAngleStep = (): void => {
        const currentTime = performance.now();
        const elapsed = currentTime - this.hardAngleStartTime;

        const duration = this.render.getSettings().coverDuration || 0;

        if (duration === 0 || elapsed >= duration) {
            super.setHardDrawingAngle(this.targetHardAngle);
            this.previousHardAngle = this.targetHardAngle;
            this.isAnimatingHardAngle = false;
            this.hardAngleAnimationId = null;
            this.redraw();
            return;
        }

        const progress = elapsed / duration;
        const easedProgress = this.easeOut(progress);

        const currentAngle =
            this.hardAngleStartAngle +
            (this.targetHardAngle - this.hardAngleStartAngle) * easedProgress;

        super.setHardDrawingAngle(currentAngle);
        this.previousHardAngle = currentAngle;
        this.redraw();

        this.hardAngleAnimationId = requestAnimationFrame(this.animateHardAngleStep);
    };

    private easeOut(t: number): number {
        return 1 - Math.pow(1 - t, 3);
    }

    private redraw(): void {
        if (this.nowDrawingDensity === PageDensity.HARD) {
            this.draw();
        }
    }

    public stopHardAngleAnimation(): void {
        if (this.hardAngleAnimationId) {
            cancelAnimationFrame(this.hardAngleAnimationId);
            this.hardAngleAnimationId = null;
            this.isAnimatingHardAngle = false;
        }
    }
}
