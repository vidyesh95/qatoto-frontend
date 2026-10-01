"use client";

import Image from "next/image";
import type React from "react";
import { FileThumbnailImage, ListingModelSlot, StepCard } from "../listing-editor-subcomponents";
import {
  MAX_PRODUCT_IMAGES,
  type ExistingImage,
  type ListingModelDraft,
} from "../listing-editor-types";

export function ImagesStep({
  existingImages,
  selectedImagePreviews,
  imageCount,
  isDraggingOver,
  imageInputRef,
  modelInputRef,
  listingModelDraft,
  modelFileRejectionMessage,
  onImageDrop,
  onImageDragOver,
  onImageDragLeave,
  onImageInputChange,
  onSelectImagesClick,
  onRemoveExistingImage,
  onMoveExistingImage,
  onMakeMainImageClick,
  onRemoveImageClick,
  onMoveSelectedPreview,
  onModelFileChange,
  onSelectModelClick,
  onRemoveModelClick,
  onUndoRemoveModelClick,
}: {
  readonly existingImages: readonly ExistingImage[];
  readonly selectedImagePreviews: readonly { readonly file: File }[];
  readonly imageCount: number;
  readonly isDraggingOver: boolean;
  readonly imageInputRef: React.RefObject<HTMLInputElement | null>;
  readonly modelInputRef: React.RefObject<HTMLInputElement | null>;
  readonly listingModelDraft: ListingModelDraft;
  readonly modelFileRejectionMessage: string | null;
  readonly onImageDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  readonly onImageDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  readonly onImageDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  readonly onImageInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onSelectImagesClick: () => void;
  readonly onRemoveExistingImage: (imageId: string) => void;
  readonly onMoveExistingImage: (imageIndex: number, direction: -1 | 1) => void;
  readonly onMakeMainImageClick: (imageIndex: number) => void;
  readonly onRemoveImageClick: (imageIndex: number) => void;
  readonly onMoveSelectedPreview: (imageIndex: number, direction: -1 | 1) => void;
  readonly onModelFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onSelectModelClick: () => void;
  readonly onRemoveModelClick: () => void;
  readonly onUndoRemoveModelClick: () => void;
}) {
  return (
    <StepCard
      title="Images & Media"
      subtitle={`Add up to ${MAX_PRODUCT_IMAGES} images. The first image becomes your main listing photo.`}
    >
      <div
        onDrop={onImageDrop}
        onDragOver={onImageDragOver}
        onDragLeave={onImageDragLeave}
        className={`flex flex-col items-center justify-center gap-4 rounded-2xl border py-16 transition-colors ${
          isDraggingOver ? "border-primary-imprint bg-secondary/50" : "border-border"
        }`}
      >
        <span className="flex size-24 items-center justify-center rounded-full bg-secondary">
          <Image
            src="/icons/add_photo_alternate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={40}
            height={40}
          />
        </span>
        <p className="text-base font-medium text-foreground">
          {isDraggingOver ? "Drop images to add" : "Drag and drop product images"}
        </p>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onImageInputChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={onSelectImagesClick}
          className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90"
        >
          <Image
            src="/icons/add_photo_alternate_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            alt=""
            width={20}
            height={20}
          />
          Select images
        </button>
      </div>

      {imageCount > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {existingImages.map((image, imageIndex) => (
            <div
              key={image.id}
              className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary/30"
            >
              {imageIndex === 0 && (
                <span className="absolute top-1.5 left-1.5 z-10 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                  Main image
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemoveExistingImage(image.id)}
                aria-label="Remove image"
                className="absolute top-1.5 right-1.5 z-10 flex size-6 cursor-pointer items-center justify-center rounded-full bg-background transition-opacity hover:opacity-80"
              >
                <Image
                  src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  alt=""
                  width={14}
                  height={14}
                />
              </button>
              {/* Remote Cloudinary asset; plain <img> avoids next/image domain config. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" className="size-full object-cover" />

              <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-1 bg-background/85 px-1 py-1">
                <button
                  type="button"
                  onClick={() => onMoveExistingImage(imageIndex, -1)}
                  disabled={imageIndex === 0}
                  aria-label="Move image earlier"
                  className="cursor-pointer rounded px-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-30"
                >
                  &larr;
                </button>
                {imageIndex !== 0 && (
                  <button
                    type="button"
                    onClick={() => onMakeMainImageClick(imageIndex)}
                    className="cursor-pointer rounded px-1 text-xs font-medium text-primary"
                  >
                    Make main
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onMoveExistingImage(imageIndex, 1)}
                  disabled={imageIndex === existingImages.length - 1}
                  aria-label="Move image later"
                  className="cursor-pointer rounded px-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-30"
                >
                  &rarr;
                </button>
              </div>
            </div>
          ))}
          {selectedImagePreviews.map((imagePreview, imageIndex) => (
            <div
              key={`${imagePreview.file.name}-${imagePreview.file.size}-${imageIndex}`}
              className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary/30"
            >
              {existingImages.length === 0 && imageIndex === 0 && (
                <span className="absolute top-1.5 left-1.5 z-10 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                  Main image
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemoveImageClick(imageIndex)}
                aria-label={`Remove ${imagePreview.file.name}`}
                className="absolute top-1.5 right-1.5 z-10 flex size-6 cursor-pointer items-center justify-center rounded-full bg-background transition-opacity hover:opacity-80"
              >
                <Image
                  src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  alt=""
                  width={14}
                  height={14}
                />
              </button>
              <FileThumbnailImage
                file={imagePreview.file}
                alt={imagePreview.file.name}
                className="size-full object-cover"
              />

              {selectedImagePreviews.length > 1 && (
                <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-1 bg-background/85 px-1 py-1">
                  <button
                    type="button"
                    onClick={() => onMoveSelectedPreview(imageIndex, -1)}
                    disabled={imageIndex === 0}
                    aria-label="Move image earlier"
                    className="cursor-pointer rounded px-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    &larr;
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveSelectedPreview(imageIndex, 1)}
                    disabled={imageIndex === selectedImagePreviews.length - 1}
                    aria-label="Move image later"
                    className="cursor-pointer rounded px-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    &rarr;
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {imageCount}/{MAX_PRODUCT_IMAGES} images added
      </p>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
        <div>
          <p className="text-sm font-medium text-foreground">3D model (optional)</p>
          <p className="text-xs text-muted-foreground">
            Let buyers spin the product from every angle. One .glb file, up to 10 MB.
          </p>
        </div>
        <input
          ref={modelInputRef}
          type="file"
          accept=".glb,model/gltf-binary"
          onChange={onModelFileChange}
          className="hidden"
        />
        <ListingModelSlot
          listingModelDraft={listingModelDraft}
          onSelectModelClick={onSelectModelClick}
          onRemoveModelClick={onRemoveModelClick}
          onUndoRemoveModelClick={onUndoRemoveModelClick}
        />
        {modelFileRejectionMessage !== null && (
          <p className="text-xs text-destructive">{modelFileRejectionMessage}</p>
        )}
      </div>
    </StepCard>
  );
}
