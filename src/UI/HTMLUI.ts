import { UI } from './UI';
import { PageFlip } from '../PageFlip';
import { FlipSetting } from '../Settings';

/**
 * UI for HTML mode
 */
export class HTMLUI extends UI {
    private items: NodeListOf<HTMLElement> | HTMLElement[];

    constructor(
        inBlock: HTMLElement,
        app: PageFlip,
        setting: FlipSetting,
        items: NodeListOf<HTMLElement> | HTMLElement[],
    ) {
        super(inBlock, app, setting);

        // Second wrapper to HTML page
        this.wrapper.insertAdjacentHTML('afterbegin', '<div class="stf__block"></div>');

        this.distElement = inBlock.querySelector('.stf__block');

        this.items = items;
        for (const item of items) {
            this.distElement.appendChild(item);
        }

        this.setHandlers();
    }

    public clear(): void {
        for (const item of this.items) {
            this.parentElement.appendChild(item);
        }
    }

    /**
     * Update page list from HTMLElements
     *
     * @param {(NodeListOf<HTMLElement>|HTMLElement[])} items - List of pages as HTML Element
     */
    public updateItems(items: NodeListOf<HTMLElement> | HTMLElement[]): void {
        this.removeHandlers();

        this.distElement.innerHTML = '';

        for (const item of items) {
            this.distElement.appendChild(item);
        }
        this.items = items;

        this.setHandlers();
    }

    public update(): void {
        this.app.getRender().update();
    }

    /**
     * 애니메이션 없이 바로 첫 페이지를 중앙에 위치시킴
     */
    public setInitialCenterPosition(): void {
        const width = this.distElement.clientWidth;
        this.distElement.style.transition = 'none'; // 애니메이션 제거
        this.distElement.style.transform = `translateX(-${width / 4}px)`;
    }

    public firstPageCenterWithAnimation(): void {
        const width = this.distElement.clientWidth;
        const animationTime = this.app.getSettings().flippingTime;
        this.distElement.style.transition = `transform ${animationTime}ms ease-out`;
        this.distElement.style.transform = `translateX(-${width / 4}px)`;
    }

    public firstPageEndCenterWithAnimation(): void {
        const width = this.distElement.clientWidth;
        const animationTime = this.app.getSettings().flippingTime;
        this.distElement.style.transition = `transform ${animationTime}ms ease-out`;
        this.distElement.style.transform = `translateX(${width / 4}px)`;
    }

    public firstPageCenterReverseWithAnimation(): void {
        const animationTime = this.app.getSettings().flippingTime;
        this.distElement.style.transition = `transform ${animationTime}ms ease-out`;
        this.distElement.style.transform = `translateX(0px)`;
    }
}
