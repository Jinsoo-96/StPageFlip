import { Page, PageDensity, PageOrientation } from './Page';
import { Render } from '../Render/Render';
/**
 * Class representing a book page as a HTML Element
 */
export declare class HTMLPage extends Page {
    private readonly element;
    private copiedElement;
    private temporaryCopy;
    private isLoad;
    constructor(render: Render, element: HTMLElement, density: PageDensity);
    /** 한페이지 모드일때 뒷면 비우기 조건 추가 */
    private shouldUseBlankPage;
    /**
     * 빈 내용의 임시 복사본 생성
     */
    private createBlankTemporaryCopy;
    newTemporaryCopy(): Page;
    getTemporaryCopy(): Page;
    hideTemporaryCopy(): void;
    draw(tempDensity?: PageDensity): void;
    private drawHard;
    private drawSoft;
    simpleDraw(orient: PageOrientation): void;
    getElement(): HTMLElement;
    load(): void;
    setOrientation(orientation: PageOrientation): void;
    setDrawingDensity(density: PageDensity): void;
}
